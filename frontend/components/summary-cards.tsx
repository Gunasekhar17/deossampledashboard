import type { Van } from "@/lib/types";

function Card({
  value,
  label,
  tone,
}: {
  value: string | number;
  label: string;
  tone?: "green" | "amber" | "red" | "default";
}) {
  const toneClass =
    tone === "green"
      ? "text-status-green"
      : tone === "amber"
      ? "text-status-amber"
      : tone === "red"
      ? "text-status-red"
      : "text-ink-900";

  return (
    <div className="flex-1 min-w-[140px] rounded-lg border border-ink-300/60 bg-white px-4 py-3">
      <div className={`text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</div>
      <div className="mt-0.5 text-xs text-ink-500">{label}</div>
    </div>
  );
}

export function SummaryCards({ vans }: { vans: Van[] }) {
  const total = vans.length;
  // Grey ("not scheduled") vans are healthy, just idle today — folded into
  // Online for this top-line summary so it matches the fleet's three
  // operational states at a glance (see lib/status.ts for the full
  // green/amber/red/grey breakdown used per-van).
  const online = vans.filter((v) => v.status === "green" || v.status === "grey").length;
  const degraded = vans.filter((v) => v.status === "amber").length;
  const offline = vans.filter((v) => v.status === "red").length;

  const patientsToday = vans.reduce((sum, v) => sum + v.patientsToday, 0);
  const scheduledToday = vans.reduce((sum, v) => sum + v.worklistToday, 0);
  const syncFailures = vans.reduce((sum, v) => sum + v.syncFailed, 0);

  return (
    <div className="flex flex-wrap gap-3">
      <Card value={total} label="Total Vans" />
      <Card value={online} label="Online" tone="green" />
      <Card value={degraded} label="Degraded" tone="amber" />
      <Card value={offline} label="Offline" tone="red" />
      <Card value={patientsToday} label="Patients Today" />
      <Card value={`${patientsToday}/${scheduledToday}`} label="Screened / Scheduled" />
      <Card value={syncFailures} label="Sync Failures" tone={syncFailures > 0 ? "red" : "default"} />
    </div>
  );
}
