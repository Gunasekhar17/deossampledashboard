import type { Van } from "@/lib/types";
import { StatusBadge } from "./status-badge";

export function VanCard({ van }: { van: Van }) {
  return (
    <div className="rounded-lg border border-ink-300/60 bg-white p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink-900">{van.displayName}</span>
      </div>
      <div className="mt-1">
        <StatusBadge status={van.status} />
      </div>
      <dl className="mt-2 space-y-1 text-xs text-ink-500">
        <div className="flex justify-between">
          <dt>Patients</dt>
          <dd className="tabular-nums text-ink-700">
            {van.patientsToday}/{van.worklistToday}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt>Sync</dt>
          <dd className="tabular-nums text-ink-700">
            {van.syncSpeedMBs !== null ? `${van.syncSpeedMBs.toFixed(2)} MB/s` : "—"}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt>Progress</dt>
          <dd className="tabular-nums text-ink-700">
            {van.progressPct !== null ? `${van.progressPct}%` : "—"}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt>Failed</dt>
          <dd className={`tabular-nums ${van.syncFailed > 0 ? "text-status-red" : "text-ink-700"}`}>
            {van.syncFailed}
          </dd>
        </div>
      </dl>
    </div>
  );
}
