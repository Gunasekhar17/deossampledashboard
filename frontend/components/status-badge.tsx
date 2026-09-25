import type { VanStatus } from "@/lib/types";

const LABELS: Record<VanStatus, string> = {
  green: "Online",
  amber: "Degraded",
  red: "Offline",
  grey: "Not scheduled",
};

const DOT_CLASSES: Record<VanStatus, string> = {
  green: "bg-status-green",
  amber: "bg-status-amber",
  red: "bg-status-red",
  grey: "bg-status-grey",
};

const TEXT_CLASSES: Record<VanStatus, string> = {
  green: "text-status-green",
  amber: "text-status-amber",
  red: "text-status-red",
  grey: "text-ink-500",
};

export function StatusBadge({ status }: { status: VanStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${TEXT_CLASSES[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLASSES[status]}`} />
      {LABELS[status]}
    </span>
  );
}
