"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Search } from "lucide-react";
import type { FleetResponse } from "@/lib/types";
import { Sidebar } from "./sidebar";
import { SummaryCards } from "./summary-cards";
import { TrustSection } from "./trust-section";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Section 2.2 of the scope doc, verbatim: refreshInterval 60000,
// refreshWhenHidden false, revalidateOnFocus true. If you need a faster
// refresh for testing, change POLL_INTERVAL_MS — but note the backend
// (Section 4) caches for 30s server-side either way, so anything under
// ~30s just re-reads the same cached payload rather than hitting Grafana
// more often.
const POLL_INTERVAL_MS = 60_000;

export function FleetDashboard() {
  const [search, setSearch] = useState("");
  const [trustFilter, setTrustFilter] = useState<string>("all");

  const { data, error, isLoading } = useSWR<FleetResponse>("/api/fleet", fetcher, {
    refreshInterval: POLL_INTERVAL_MS,
    refreshWhenHidden: false,
    revalidateOnFocus: true,
  });

  const vans = data?.vans ?? [];

  const trusts = useMemo(
    () => Array.from(new Set(vans.map((v) => v.trust))).sort(),
    [vans],
  );

  const filteredVans = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vans.filter((v) => {
      if (trustFilter !== "all" && v.trust !== trustFilter) return false;
      if (!q) return true;
      return v.trust.toLowerCase().includes(q) || v.instance.toLowerCase().includes(q);
    });
  }, [vans, search, trustFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filteredVans>();
    for (const van of filteredVans) {
      const list = map.get(van.trust) ?? [];
      list.push(van);
      map.set(van.trust, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredVans]);

  return (
    <div className="flex h-screen">
      <Sidebar />

      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-ink-900">Fleet Health</h1>
          <div className="flex items-center gap-2 text-xs">
            {data?.stale && (
              <span className="rounded-full bg-amber-100 px-2 py-1 font-medium text-status-amber">
                Data delayed
              </span>
            )}
            <span className="flex items-center gap-1.5 rounded-full bg-status-green/10 px-2 py-1 font-medium text-status-green">
              <span className="h-1.5 w-1.5 rounded-full bg-status-green" />
              Live
            </span>
          </div>
        </div>

        {error && !data && (
          <div className="mb-4 rounded-lg border border-status-red/30 bg-status-red/5 p-4 text-sm text-status-red">
            Couldn&apos;t load fleet data. Check that FLEET_FUNCTION_URL and FLEET_FUNCTION_KEY are set.
          </div>
        )}

        {isLoading && !data && (
          <div className="text-sm text-ink-500">Loading fleet data…</div>
        )}

        {data && (
          <>
            <p className="mb-4 text-xs text-ink-500">
              Last updated: {new Date(data.updatedAt).toLocaleString("en-GB")}
            </p>

            <div className="mb-4">
              <SummaryCards vans={vans} />
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3">
              <select
                value={trustFilter}
                onChange={(e) => setTrustFilter(e.target.value)}
                className="rounded-md border border-ink-300/60 bg-white px-3 py-2 text-sm text-ink-900"
              >
                <option value="all">All trusts ({trusts.length})</option>
                {trusts.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </select>

              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search trusts or vans..."
                  className="w-full rounded-md border border-ink-300/60 bg-white py-2 pl-9 pr-3 text-sm text-ink-900"
                />
              </div>
            </div>

            <p className="mb-2 text-xs font-medium text-ink-500">Fleet by Trust</p>
            <div className="space-y-3 pb-8">
              {grouped.map(([trust, trustVans]) => (
                <TrustSection key={trust} trust={trust} vans={trustVans} />
              ))}
              {grouped.length === 0 && (
                <p className="text-sm text-ink-500">No vans match your search.</p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
