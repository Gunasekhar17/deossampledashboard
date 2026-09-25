// lib/types.ts

// Exactly the fields returned by the backend edge function (Section 3.2 of
// the scope doc — one row per van, all values as strings, "" for missing).
export interface RawVan {
  instance: string;
  trust: string;
  "Online Status": string;
  Studies: string;
  Patients: string;
  Worklist: string;
  "Sync Speed": string;
  "Modality status": string;
  "Sync Queue failed": string;
  "Sync Queue Active": string;
  "Sync Queue Retries": string;
  "Sync Queue Completed": string;
}

export type VanStatus = "green" | "amber" | "red" | "grey";

// What the frontend actually renders — RawVan plus everything derived from it.
export interface Van extends RawVan {
  displayName: string;
  status: VanStatus;
  patientsToday: number;
  worklistToday: number;
  syncSpeedMBs: number | null;
  syncFailed: number;
  syncRetries: number;
  /** Screened / scheduled, 0-100, or null if nothing scheduled today */
  progressPct: number | null;
}

export interface FleetResponse {
  updatedAt: string;
  stale: boolean;
  vans: Van[];
}
