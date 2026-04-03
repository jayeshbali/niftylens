"use client";

import type { MarketSnapshot } from "@/types";

interface WatchListProps {
  latest: MarketSnapshot;
  prev: MarketSnapshot | null;
}

interface WatchItem {
  priority: number; // lower = more notable
  text: string;
}

function fmt(v: number, decimals = 1): string {
  return v.toFixed(decimals);
}

export function WatchList({ latest, prev }: WatchListProps) {
  const candidates: WatchItem[] = [];

  const {
    indiaVsEmPremium, forwardErp, epsGrowthYoy,
    mcapGdp, sipMonthlyAvg,
  } = latest;

  const prevSip = prev?.sipMonthlyAvg ?? null;

  // India-EM premium below 30% — constructive for FII
  if (indiaVsEmPremium !== null && indiaVsEmPremium < 30) {
    candidates.push({
      priority: 1,
      text: `India-EM premium at ${fmt(indiaVsEmPremium)}% — among the lowest in years. Watch for FII buying reversal.`,
    });
  }

  // Forward ERP tight (-1.5% to 0%)
  if (forwardErp !== null && forwardErp >= -1.5 && forwardErp <= 0) {
    candidates.push({
      priority: 2,
      text: `Forward ERP at ${fmt(forwardErp, 2)}% — tight. Next quarter's earnings results will be the critical test.`,
    });
  }

  // EPS growth slowing (< 5%)
  if (epsGrowthYoy !== null && epsGrowthYoy < 5) {
    const dir = epsGrowthYoy < 0 ? "contracting" : "slowing";
    candidates.push({
      priority: 3,
      text: `Earnings growth ${dir} at ${fmt(epsGrowthYoy)}% YoY. Consensus expects a recovery — monitor actual quarterly results closely.`,
    });
  }

  // Mcap/GDP above 110%
  if (mcapGdp !== null && mcapGdp > 110) {
    candidates.push({
      priority: 4,
      text: `Mcap/GDP at ${fmt(mcapGdp)}% — above historical average (~80%). Structural formalisation of savings partially offsets the elevated reading.`,
    });
  }

  // SIP at record high vs prior year
  if (
    sipMonthlyAvg !== null &&
    prevSip !== null &&
    sipMonthlyAvg > prevSip
  ) {
    candidates.push({
      priority: 5,
      text: `SIP inflows at a record ₹${(sipMonthlyAvg / 1000).toFixed(0)}K Cr/month — up ${fmt(((sipMonthlyAvg - prevSip) / prevSip) * 100, 0)}% YoY. Domestic structural floor is strengthening.`,
    });
  }

  // Pick top 3 by priority
  const items = candidates
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3);

  if (items.length === 0) return null;

  return (
    <div
      className="rounded-xl p-5 border"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: "var(--amber-accent)" }}
        />
        <span
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: "var(--amber-accent)" }}
        >
          What to Watch
        </span>
      </div>
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span
              className="mt-1.5 shrink-0 w-1 h-1 rounded-full"
              style={{ background: "var(--text-muted)" }}
            />
            <span className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {item.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
