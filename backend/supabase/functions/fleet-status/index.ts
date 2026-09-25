// backend/supabase/functions/fleet-status/index.ts
//
// Proxies Prometheus queries through UKDEOS's Grafana so the service
// account token never reaches the browser (Technical Scope, Section 1.1 / 3).
//
// Deploy: this is the function you already have live as "deosdata-function".
// You can either rename it to "fleet-status" on redeploy, or keep the
// existing name and just point FLEET_FUNCTION_URL in the frontend at
// whatever your deployed URL is. Nothing in this file cares about its own name.

const GRAFANA = "https://mis.ukdeos.com/mon";
const DS_UID = "cdmwy4dypbeo0e";
const TOKEN = Deno.env.get("GRAFANA_TOKEN")!;
const HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: "application/json",
  "Content-Type": "application/json",
};

// Output fields, in the order they appear in every row
const FIELDS = [
  "trust",
  "instance",
  "Online Status",
  "Studies",
  "Patients",
  "Worklist",
  "Sync Speed",
  "Modality status",
  "Sync Queue failed",
  "Sync Queue Active",
  "Sync Queue Retries",
  "Sync Queue Completed",
];

// ---- "Today's Time" node (BST = UTC+1) ----
function todayRange() {
  const OFFSET = 60 * 60 * 1000;
  const now = Date.now();
  const b = new Date(now + OFFSET);
  const start =
    Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()) - OFFSET;
  return { from: String(start), to: String(now) };
}

// ---- retryOnFail equivalent ----
async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let err: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      err = e;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw err;
}

// ---- HTTP Request + Split Out (results.A.frames) ----
async function queryFrames(
  expr: string,
  opts: { table?: boolean; range?: boolean },
  from: string,
  to: string,
) {
  const q: Record<string, unknown> = {
    refId: "A",
    datasource: { type: "prometheus", uid: DS_UID },
    expr,
    instant: !opts.range,
    range: !!opts.range,
  };
  if (opts.table) q.format = "table";
  return withRetry(async () => {
    const res = await fetch(`${GRAFANA}/api/ds/query`, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ queries: [q], from, to }),
    });
    if (!res.ok) throw new Error(`Grafana ${res.status} for ${expr}`);
    const json = await res.json();
    return (json?.results?.A?.frames ?? []) as any[];
  });
}

type Row = { trust?: string; instance: string; [k: string]: unknown };

// ---- Edit Fields (Set) node: frame -> row ----
function toRows(
  frames: any[],
  field: string,
  fmt: (values: any[]) => unknown,
): Row[] {
  return frames.map((f) => {
    const labels = f.schema?.fields?.[1]?.labels ?? {};
    return {
      trust: labels.trust,
      instance: labels.instance,
      [field]: fmt(f.data?.values?.[1] ?? []),
    };
  });
}

const round0 = (v: any[]) => (v[0] == null ? null : String(Math.round(v[0])));
const online = (v: any[]) => (v[0] == 1 ? "Online" : "Offline");
const speed = (v: any[]) => {
  const last = v[v.length - 1];
  return last == null ? null : `${(last / 1_000_000).toFixed(2)} MB/s`;
};

// ---- Merge nodes (combine by fields, keepEverything = full outer join) ----
function mergeAll(...sets: Row[][]): Row[] {
  const map = new Map<string, Row>();
  for (const set of sets) {
    for (const row of set) {
      if (!row.instance) continue;
      const cur = map.get(row.instance) ?? { instance: row.instance };
      for (const [k, v] of Object.entries(row)) {
        if (v !== undefined && v !== null && cur[k] === undefined) cur[k] = v;
      }
      map.set(row.instance, cur);
    }
  }
  return [...map.values()];
}

// ---- Fill missing / null values with an empty string ----
function fillEmpty(rows: Row[]): Row[] {
  return rows.map((row) => {
    const out: Row = { instance: row.instance };
    for (const f of FIELDS) {
      const v = row[f];
      out[f] = v === undefined || v === null ? "" : v;
    }
    if (!out.trust) out.trust = row.instance.split(".")[0];
    return out;
  });
}

// CORS: only needed if the browser ever calls this function directly.
// In this repo the frontend calls it server-side (via /api/fleet), so this
// is a safety net rather than the primary access path.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const { from, to } = todayRange();
    const [
      onlineF, studiesF, patientsF, worklistF, speedF,
      modalityF, failedF, activeF, retriesF, completedF,
    ] = await Promise.all([
      queryFrames(`probe_success{instance!~".*(server|router|xray).*", job="blackbox"}`, { table: true }, from, to),
      queryFrames(`orthanc_number_of_studies_today{instance!~".*server"}`, { table: true }, from, to),
      queryFrames(`orthanc_number_of_patients_today{instance!~".*server"}`, { table: true }, from, to),
      queryFrames(`deos_worklist_today_count{instance!~".*server"}`, { table: true }, from, to),
      queryFrames(`deos_sync_transfer_speed{instance!~".*server",quantile="0.5"}`, { range: true }, from, to),
      queryFrames(`probe_success{instance!~".*router",job="modality"}`, {}, from, to),
      queryFrames(`deos_sync_queue_failed_count{instance!~".*server"}`, { table: true }, from, to),
      queryFrames(`deos_sync_queue_active_count{instance!~".*server"}`, { table: true }, from, to),
      queryFrames(`deos_sync_queue_retry_count{instance!~".*server"}`, { table: true }, from, to),
      queryFrames(`deos_sync_queue_complete_count{instance!~".*server"}`, { table: true }, from, to),
    ]);

    const allInstances: string[] = await withRetry(async () => {
      const res = await fetch(
        `${GRAFANA}/api/datasources/proxy/uid/${DS_UID}/api/v1/label/instance/values`,
        { headers: HEADERS },
      );
      if (!res.ok) throw new Error(`Grafana ${res.status} (instances)`);
      return (await res.json()).data ?? [];
    });
    const instanceRows: Row[] = allInstances
      .filter((i) => !/server|router|xray/i.test(i))
      .map((i) => ({ trust: i.split(".")[0], instance: i }));

    const merged = mergeAll(
      toRows(onlineF, "Online Status", online),
      toRows(studiesF, "Studies", round0),
      toRows(patientsF, "Patients", round0),
      toRows(worklistF, "Worklist", round0),
      toRows(speedF, "Sync Speed", speed),
      toRows(modalityF, "Modality status", online),
      instanceRows,
      toRows(failedF, "Sync Queue failed", round0),
      toRows(activeF, "Sync Queue Active", round0),
      toRows(retriesF, "Sync Queue Retries", round0),
      toRows(completedF, "Sync Queue Completed", round0),
    );

    merged.sort((a, b) => a.instance.localeCompare(b.instance));
    const result = fillEmpty(merged);

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }
});
