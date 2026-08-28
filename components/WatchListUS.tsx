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

export function WatchListUS({ latest }: WatchListUSProps) {
  const candidates: WatchItem[] = [];

  const { usVsExUsPremium, trailingErp, epsGrowthYoy, mcapGdp, capeRatio, sp500PeTrailing } = latest;

  if (usVsExUsPremium !== null && usVsExUsPremium > 45) {
    candidates.push({
      priority: 1,
      text: `US vs ex-US premium at ${fmt(usVsExUsPremium)}% — stretched. Watch for rotation into cheaper international markets.`,
    });
  }

  if (trailingErp !== null && trailingErp >= -1.5 && trailingErp <= 0) {
    candidates.push({
      priority: 2,
      text: `Trailing ERP at ${fmt(trailingErp, 2)}% — tight. Bonds currently compete well with equity earnings.`,
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

  if (capeRatio !== null && sp500PeTrailing !== null && capeRatio > sp500PeTrailing * 1.5) {
    candidates.push({
      priority: 5,
      text: `Shiller CAPE (${fmt(capeRatio)}x) is running well above trailing PE (${fmt(sp500PeTrailing)}x) — the earnings-smoothing lens sees more froth than the headline number.`,
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
