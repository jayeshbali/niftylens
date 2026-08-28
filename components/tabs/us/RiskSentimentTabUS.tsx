"use client";

import type { UsMarketSnapshot } from "@/types";
import type { UsMarketDailySnapshot, UsMarketMonthlyFlow } from "@/lib/db/schema";
import { DataTable, type TableRow } from "@/components/DataTable";
import { InfoCard } from "@/components/InfoCard";
import { VerdictCard } from "@/components/VerdictCard";
import { metricExplanationsUS } from "@/lib/content/metric-explanations-us";
import { SNAPSHOT_YEARS_US, CAPE_MEDIAN } from "@/lib/constants-us";

interface RiskSentimentTabUSProps {
  snapshots: UsMarketSnapshot[];
  view: "snapshot" | "full";
  latest: UsMarketSnapshot;
  latestDaily?: Pick<UsMarketDailySnapshot, "vix" | "hySpread" | "yieldCurve10y2y" | "realYield10y"> | null;
  latestMonthly?: Pick<
    UsMarketMonthlyFlow,
    "aaiiBullishPct" | "aaiiBearishPct" | "aaiiNeutralPct" | "marginDebtBalance" | "top10ConcentrationPct"
  > | null;
}

function vixSignal(v: number | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  if (v < 15) return "Neutral";
  if (v < 25) return "Fair";
  return "Danger";
}

function spreadSignal(v: number | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  if (v < 4) return "Neutral";
  if (v < 6) return "Caution";
  return "Danger";
}

function curveSignal(v: number | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  if (v < 0) return "Danger"; // inverted
  if (v < 0.5) return "Caution";
  return "Neutral";
}

export function RiskSentimentTabUS({
  snapshots,
  view,
  latest,
  latestDaily,
  latestMonthly,
}: RiskSentimentTabUSProps) {
  const displaySnapshots =
    view === "snapshot" ? snapshots.filter((s) => SNAPSHOT_YEARS_US.includes(s.year)) : snapshots;

  const years = displaySnapshots.map((s) => s.year);

  const capeRows: TableRow[] = [
    {
      label: "Shiller CAPE",
      values: displaySnapshots.map((s) => (s.capeRatio !== null ? s.capeRatio.toFixed(1) : null)),
      mono: true,
    },
    {
      label: `Long-run Median (${CAPE_MEDIAN}x)`,
      values: displaySnapshots.map(() => CAPE_MEDIAN.toFixed(1)),
      mono: true,
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <InfoCard title={metricExplanationsUS.riskSentiment.title} content={metricExplanationsUS.riskSentiment} />

      <div>
        <h2 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wider">
          Current Readings
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <VerdictCard
            label="VIX"
            value={latestDaily?.vix !== null && latestDaily?.vix !== undefined ? latestDaily.vix.toFixed(1) : "—"}
            signal={vixSignal(latestDaily?.vix)}
            context="CBOE Volatility Index. Below 15 = calm. Above 25 = elevated fear."
          />
          <VerdictCard
            label="HY Credit Spread"
            value={
              latestDaily?.hySpread !== null && latestDaily?.hySpread !== undefined
                ? latestDaily.hySpread.toFixed(2) + "%"
                : "—"
            }
            signal={spreadSignal(latestDaily?.hySpread)}
            context="ICE BofA high-yield OAS. Widening spreads signal credit stress."
          />
          <VerdictCard
            label="10Y–2Y Yield Curve"
            value={
              latestDaily?.yieldCurve10y2y !== null && latestDaily?.yieldCurve10y2y !== undefined
                ? (latestDaily.yieldCurve10y2y >= 0 ? "+" : "") + latestDaily.yieldCurve10y2y.toFixed(2) + "%"
                : "—"
            }
            signal={curveSignal(latestDaily?.yieldCurve10y2y)}
            context="Negative (inverted) has historically preceded recessions."
          />
          <VerdictCard
            label="Real 10Y Yield"
            value={
              latestDaily?.realYield10y !== null && latestDaily?.realYield10y !== undefined
                ? latestDaily.realYield10y.toFixed(2) + "%"
                : "—"
            }
            signal={null}
            context="10Y TIPS yield — a cleaner risk-free rate than nominal Treasuries."
          />
          <VerdictCard
            label="AAII Bullish %"
            value={
              latestMonthly?.aaiiBullishPct !== null && latestMonthly?.aaiiBullishPct !== undefined
                ? latestMonthly.aaiiBullishPct.toFixed(1) + "%"
                : "—"
            }
            signal={null}
            context="Weekly retail investor sentiment survey. Extremes are contrarian signals."
          />
          <VerdictCard
            label="AAII Bearish %"
            value={
              latestMonthly?.aaiiBearishPct !== null && latestMonthly?.aaiiBearishPct !== undefined
                ? latestMonthly.aaiiBearishPct.toFixed(1) + "%"
                : "—"
            }
            signal={null}
            context="High bearishness at market bottoms is a classic contrarian tell."
          />
          <VerdictCard
            label="Margin Debt"
            value={
              latestMonthly?.marginDebtBalance !== null && latestMonthly?.marginDebtBalance !== undefined
                ? `$${latestMonthly.marginDebtBalance.toFixed(0)}B`
                : "—"
            }
            signal={null}
            context="FINRA margin debt balance. Rapid growth flags speculative leverage."
          />
          <VerdictCard
            label="Top-10 Concentration"
            value={
              latestMonthly?.top10ConcentrationPct !== null && latestMonthly?.top10ConcentrationPct !== undefined
                ? latestMonthly.top10ConcentrationPct.toFixed(1) + "%"
                : "—"
            }
            signal={null}
            context="S&P 500's top-10 holdings weight. Elevated concentration raises single-name risk."
          />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wider">
          Shiller CAPE — History
        </h2>
        <DataTable years={years} rows={capeRows} highlightYears={[]} />
      </div>

      <p className="text-xs text-text-muted px-1">
        These metrics are informational only — none feed into the Composite Score, so that
        score stays directly comparable to India's 10-signal structure. AAII sentiment,
        margin debt, and concentration have no free API and are entered manually.
      </p>
    </div>
  );
}
