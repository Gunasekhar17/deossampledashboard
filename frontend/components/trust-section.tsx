"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Van } from "@/lib/types";
import { VanCard } from "./van-card";

export function TrustSection({ trust, vans }: { trust: string; vans: Van[] }) {
  const [open, setOpen] = useState(true);

  const counts = {
    green: vans.filter((v) => v.status === "green" || v.status === "grey").length,
    amber: vans.filter((v) => v.status === "amber").length,
    red: vans.filter((v) => v.status === "red").length,
  };
  const patients = vans.reduce((sum, v) => sum + v.patientsToday, 0);

  return (
    <div className="rounded-lg border border-ink-300/60 bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <ChevronDown
            className={`h-4 w-4 text-ink-500 transition-transform ${open ? "" : "-rotate-90"}`}
          />
          <span className="text-sm font-semibold capitalize text-ink-900">
            {trust.replace(/_/g, " ")}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-ink-500">
          <span className="flex items-center gap-3">
            <span className="text-status-green">● {counts.green}</span>
            <span className="text-status-amber">● {counts.amber}</span>
            <span className="text-status-red">● {counts.red}</span>
          </span>
          <span>{patients} patients</span>
        </div>
      </button>

      {open && (
        <div className="grid grid-cols-1 gap-3 border-t border-ink-300/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {vans.map((van) => (
            <VanCard key={van.instance} van={van} />
          ))}
        </div>
      )}
    </div>
  );
}
