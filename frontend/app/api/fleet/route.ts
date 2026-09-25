// app/api/fleet/route.ts
//
// Server-side proxy to the Supabase edge function (Section 2.1: browser
// never talks to Grafana or the edge function's key directly). Implements
// Section 4's polling/caching rules:
//   - response cached 30s so multiple tabs/users share one set of Grafana
//     calls
//   - on failure, return the last good payload with stale: true rather than
//     blanking the dashboard

import { NextResponse } from "next/server";
import { enrichVan } from "@/lib/status";
import type { RawVan, FleetResponse } from "@/lib/types";

export const dynamic = "force-dynamic"; // caching is handled explicitly below

const FUNCTION_URL = process.env.FLEET_FUNCTION_URL;
const FUNCTION_KEY = process.env.FLEET_FUNCTION_KEY;

const CACHE_MS = 30_000; // Section 4: "Server response cached for 30 seconds"

// Best-effort in-memory cache. Serverless instances are ephemeral and may be
// cold-started at any time, so this reduces load on warm instances but is
// not a durable store — that's fine, it only needs to survive a few seconds.
let lastGood: FleetResponse | null = null;
let lastFetchedAt = 0;

export async function GET() {
  if (!FUNCTION_URL || !FUNCTION_KEY) {
    return NextResponse.json(
      { error: "FLEET_FUNCTION_URL / FLEET_FUNCTION_KEY not configured" },
      { status: 500 },
    );
  }

  const now = Date.now();
  if (lastGood && now - lastFetchedAt < CACHE_MS) {
    return NextResponse.json(lastGood);
  }

  try {
    const res = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FUNCTION_KEY}`,
        "Content-Type": "application/json",
      },
      // Vercel functions have their own timeout, but bail out early so a
      // slow Grafana doesn't hold the whole request open.
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`fleet-status responded ${res.status}`);
    }

    const raw: RawVan[] = await res.json();
    const payload: FleetResponse = {
      updatedAt: new Date().toISOString(),
      stale: false,
      vans: raw.map(enrichVan),
    };

    lastGood = payload;
    lastFetchedAt = now;
    return NextResponse.json(payload);
  } catch (err) {
    if (lastGood) {
      // Section 4: "The UI shows a 'Data delayed' banner rather than
      // blanking the heatmap"
      return NextResponse.json({ ...lastGood, stale: true });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}
