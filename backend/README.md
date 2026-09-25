# Backend — Supabase Edge Function

This is the piece you already have deployed and working (as `deosdata-function`
in the dashboard). It's the server-side Grafana proxy from the Technical
Scope, Section 2.1 / 3: it holds the `GRAFANA_TOKEN` so it never reaches the
browser, and returns one JSON array of van rows.

## Deploy via CLI

```bash
supabase login
supabase link --project-ref <ref>
supabase secrets set GRAFANA_TOKEN="glsa_..." --project-ref <ref>
supabase functions deploy fleet-status --project-ref <ref>
```

## Or via the dashboard (what you've already been doing)

1. Edge Functions → your function → Code tab → paste `supabase/functions/fleet-status/index.ts`
2. Secrets tab → add `GRAFANA_TOKEN` with your Grafana service account token as the value
3. Deploy function
4. Copy the function URL (looks like `https://<ref>.supabase.co/functions/v1/<name>`)
   and the `anon` key from Project Settings → API — the frontend needs both.

## What it returns

One JSON array, one object per van:

```json
[
  {
    "instance": "bradford.van1-penyghent",
    "trust": "bradford",
    "Online Status": "Online",
    "Studies": "0",
    "Patients": "0",
    "Worklist": "52",
    "Sync Speed": "1.80 MB/s",
    "Modality status": "Offline",
    "Sync Queue failed": "0",
    "Sync Queue Active": "0",
    "Sync Queue Retries": "0",
    "Sync Queue Completed": "12"
  }
]
```

No status (green/amber/red) is computed here — that logic lives in the
frontend's `/api/fleet` route (Section 5 of the scope: `deriveStatus` should
be one pure, testable function, and Section 10 puts stats recalculation on
the client from the shared payload).

## Open items from the scope doc (Section 12) that affect this function

- `deos_sync_destination_status` and the other `deos_*` gauges aren't wired
  in yet — their value semantics (does `1` mean OK?) are still unconfirmed.
- The modality probe's instance label may not match the van's own instance
  label 1:1 (Section 3.3) — worth confirming before trusting "Modality status"
  for anything more than display.

## Security

Rotate the Grafana token before go-live. The current one has reportedly been
shared in plain text elsewhere — get UKDEOS to issue a fresh Viewer-only
service account token, store only that in `supabase secrets`, and have them
revoke the old one.
