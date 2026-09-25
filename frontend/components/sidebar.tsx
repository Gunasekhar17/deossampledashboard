import { Activity, Map, Ticket, FileText, History, Users } from "lucide-react";

// Static shell matching the reference mockup's nav. Only "Fleet Health" is
// wired up in this pass — the rest are separate build phases per Section 10
// of the scope (auth/roles, report management UI, and the Fleet Map /
// Tickets add-ons in Section 14 are out of this build until ordered).
const NAV = [
  { label: "Fleet Health", icon: Activity, active: true },
  { label: "Fleet Map", icon: Map, active: false },
  { label: "Tickets", icon: Ticket, active: false },
];

const REPORTS_NAV = [
  { label: "Report Management", icon: FileText, active: false },
  { label: "Audit Log", icon: History, active: false },
];

export function Sidebar() {
  return (
    <aside className="flex h-full w-56 shrink-0 flex-col bg-ink-900 px-3 py-4 text-white">
      <div className="mb-6 px-2 text-sm font-semibold tracking-tight">UKDeos</div>

      <div className="mb-1 px-2 text-[11px] text-white/40">Monitoring</div>
      <nav className="mb-4 flex flex-col gap-0.5">
        {NAV.map((item) => (
          <div
            key={item.label}
            className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
              item.active ? "bg-blue-600 text-white" : "text-white/70"
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </div>
        ))}
      </nav>

      <div className="mb-1 px-2 text-[11px] text-white/40">Reports</div>
      <nav className="mb-4 flex flex-col gap-0.5">
        {REPORTS_NAV.map((item) => (
          <div key={item.label} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-white/70">
            <item.icon className="h-4 w-4" />
            {item.label}
          </div>
        ))}
      </nav>

      <div className="mb-1 px-2 text-[11px] text-white/40">Settings</div>
      <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-white/70">
        <Users className="h-4 w-4" />
        Users &amp; Access
      </div>
    </aside>
  );
}
