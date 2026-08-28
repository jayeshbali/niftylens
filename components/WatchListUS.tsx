"use client";

import type { UsMarketSnapshot } from "@/types";

interface WatchListUSProps {
  latest: UsMarketSnapshot;
  prev: UsMarketSnapshot | null;
}

interface WatchItem {
  priority: number;
  text: string;
}

function fmt(v: number, decimals = 1): string {
  return v.toFixed(decimals);
}

export function WatchListUS({ latest, prev }: WatchListUSProps) {
  const candidates: WatchItem[] = [];

  const { usVsExUsPremium, forwardErp, epsGrowthYoy, mcapGdp, fundNetFlow } = latest;
  const prevFundNet = prev?.fundNetFlow ?? null;

  if (usVsExUsPremium !== null && usVsExUsPremium > 45) {
    candidates.push({
      priority: 1,
      text: `US vs ex-US premium at ${fmt(usVsExUsPremium)}% — stretched. Watch for rotation into cheaper international markets.`,
    });
  }

  if (forwardErp !== null && forwardErp >= -1.5 && forwardErp <= 0) {
    candidates.push({
      priority: 2,
      text: `Forward ERP at ${fmt(forwardErp, 2)}% — tight. Next quarter's earnings will be the critical test.`,
    });
  }

  if (epsGrowthYoy !== null && epsGrowthYoy < 5) {
    const dir = epsGrowthYoy < 0 ? "contracting" : "slowing";
    candidates.push({
      priority: 3,
      text: `Earnings growth ${dir} at ${fmt(epsGrowthYoy)}% YoY. Monitor actual quarterly results closely.`,
    });
  }

  if (mcapGdp !== null && mcapGdp > 150) {
    candidates.push({
      priority: 4,
      text: `Mcap/GDP at ${fmt(mcapGdp)}% — well above the pre-2000s framework's "overvalued" threshold. The ratio has drifted structurally higher, but this remains a historically stretched reading.`,
    });
  }

  if (fundNetFlow !== null && prevFundNet !== null && fundNetFlow < prevFundNet && fundNetFlow < 0) {
    candidates.push({
      priority: 5,
      text: `Long-term fund flows turned net negative ($${fmt(Math.abs(fundNetFlow))}B outflow) — a shift from prior-year inflows.`,
    });
  }

  const items = candidates.sort((a, b) => a.priority - b.priority).slice(0, 3);

  if (items.length === 0) return null;

  return (
    <div>
      <span
        className="text-xs font-bold uppercase tracking-widest"
        style={{ color: "var(--text-muted)" }}
      >
        What to Watch
      </span>
      <ul className="mt-1.5 space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-baseline gap-2">
            <span className="shrink-0 text-xs" style={{ color: "var(--amber-accent)" }}>›</span>
            <span className="text-xs leading-snug" style={{ color: "var(--text-secondary)" }}>
              {item.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
