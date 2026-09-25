// lib/status.ts
//
// Implements the Status Derivation Rules from the Technical Scope, Section 5:
// first match wins, Red > Grey > Amber > Green. Thresholds are hardcoded
// here for now — Section 6's data model puts them in a `settings` table so
// they can be tuned without a deploy; move them there once that store exists.

import type { RawVan, Van, VanStatus } from "./types";

const THRESHOLDS = {
  failedCount: 3, // Section 5: "failed 3"
  retryCount: 5, // Section 5: "retry 5"
  speedFloorMBs: 0.25, // Section 5: "speed 0.25 MB/s"
};

// Section 5: "Known low baseline vans ... will trip the speed floor
// permanently. Support a per van override (vans.speed_floor) rather than
// lowering the fleet wide floor." No config store yet, so this is a
// placeholder until vans.speed_floor exists.
const SPEED_FLOOR_OVERRIDES: Record<string, number> = {
  "reading.perky": 0.1,
  "swindon.rio": 0.15,
};

function toNumber(value: string): number | null {
  if (value === "" || value == null) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function parseSpeed(value: string): number | null {
  if (!value) return null;
  const match = value.match(/[\d.]+/);
  return match ? Number(match[0]) : null;
}

export function deriveStatus(raw: RawVan): VanStatus {
  const online = raw["Online Status"];
  const patients = toNumber(raw.Patients) ?? 0;
  const worklist = toNumber(raw.Worklist) ?? 0;
  const failed = toNumber(raw["Sync Queue failed"]) ?? 0;
  const retries = toNumber(raw["Sync Queue Retries"]) ?? 0;
  const speed = parseSpeed(raw["Sync Speed"]);
  const floor = SPEED_FLOOR_OVERRIDES[raw.instance] ?? THRESHOLDS.speedFloorMBs;

  // --- Red: offline ---
  // NOTE: the scope doc's Red rule also fires on modality_up = 0 or
  // sync_dest_up = 0 (Section 5), but Open Questions #2 and #3 (Section 12)
  // mean the value semantics of those gauges aren't confirmed — most vans
  // report "Modality status": "Offline" even when clearly working, which
  // looks like it tracks scanner power state rather than van health. Wire
  // those into this rule once confirmed; for now Red is driven only by the
  // blackbox "Online Status" probe and staleness (staleness itself isn't
  // enforced here since the backend doesn't yet return a scrape timestamp).
  if (online === "Offline" || online === "") return "red";

  // --- Grey: not scheduled today ---
  // Avoids the false alarm called out in Section 5: a van with no
  // appointments today shouldn't show red.
  if (worklist === 0 && patients === 0) return "grey";

  // --- Amber: degraded ---
  if (failed >= THRESHOLDS.failedCount) return "amber";
  if (retries >= THRESHOLDS.retryCount) return "amber";
  if (speed !== null && speed < floor) return "amber";

  // --- Green: online ---
  return "green";
}

export function enrichVan(raw: RawVan): Van {
  const patients = toNumber(raw.Patients) ?? 0;
  const worklist = toNumber(raw.Worklist) ?? 0;

  return {
    ...raw,
    displayName: raw.instance.split(".").slice(1).join(".") || raw.instance,
    status: deriveStatus(raw),
    patientsToday: patients,
    worklistToday: worklist,
    syncSpeedMBs: parseSpeed(raw["Sync Speed"]),
    syncFailed: toNumber(raw["Sync Queue failed"]) ?? 0,
    syncRetries: toNumber(raw["Sync Queue Retries"]) ?? 0,
    progressPct: worklist > 0 ? Math.round((patients / worklist) * 100) : null,
  };
}
