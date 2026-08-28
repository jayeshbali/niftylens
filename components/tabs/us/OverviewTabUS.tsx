"use client";

import type { UsMarketSnapshot } from "@/types";
import { VerdictCard } from "@/components/VerdictCard";
import { DataTable } from "@/components/DataTable";
import { MarketNarrativeUS } from "@/components/MarketNarrativeUS";
import { WatchListUS } from "@/components/WatchListUS";
import { SNAPSHOT_YEARS_US } from "@/lib/constants-us";

interface OverviewTabUSProps {
  snapshots: UsMarketSnapshot[];
  view: "snapshot" | "full";
  latest: UsMarketSnapshot;
}

function fmtPct(v: number | null, decimals = 1): string {
  if (v === null || v === undefined) return "—";
  return (v >= 0 ? "+" : "") + v.toFixed(decimals) + "%";
}

function fmtFlow(v: number | null): string {
  if (v === null || v === undefined) return "—";
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "+";
  return `${sign}$${abs.toFixed(0)}B`;
}

function compositeSignal(score: number | null): string {
  if (score === null || score === undefined) return "—";
  if (score >= 7) return "Attractive";
  if (score >= 4) return "Neutral";
  if (score >= 2.5) return "Caution";
  return "Danger";
}

function peSignal(pe: number | null): string {
  if (pe === null || pe === undefined) return "—";
  if (pe < 17) return "Attractive";
  if (pe <= 22) return "Neutral";
  return "Danger";
}

function pbSignal(pb: number | null): string {
  if (pb === null || pb === undefined) return "—";
  if (pb < 3.0) return "Attractive";
  if (pb <= 4.0) return "Neutral";
  if (pb <= 5.0) return "Caution";
  return "Danger";
}

function mcapGdpSignal(v: number | null): string | null {
  if (v === null || v === undefined) return null;
  if (v < 100) return "Attractive";
  if (v <= 150) return "Neutral";
  return "Danger";
}

export function OverviewTabUS({ snapshots, view, latest }: OverviewTabUSProps) {
  const displaySnapshots =
    view === "snapshot"
      ? snapshots.filter((s) => SNAPSHOT_YEARS_US.includes(s.year))
      : snapshots;

  const years = displaySnapshots.map((s) => s.year);
  const prev = snapshots.length >= 2 ? snapshots[snapshots.length - 2] : null;

  const summaryRows = [
    {
      label: "S&P 500 Level",
      values: displaySnapshots.map((s) =>
        s.sp500Level ? Math.round(s.sp500Level).toLocaleString("en-US") : null
      ),
      mono: true,
    },
    {
      label: "PE (Trailing)",
      values: displaySnapshots.map((s) => (s.sp500PeTrailing ? s.sp500PeTrailing.toFixed(1) : null)),
      mono: true,
      getCellClass: (v: string | number | null | undefined) => {
        const n = typeof v === "string" ? parseFloat(v) : (v as number | null);
        if (!n) return "";
        if (n < 17) return "cell-green";
        if (n <= 22) return "";
        return "cell-red";
      },
    },
    {
      label: "PB Ratio",
      values: displaySnapshots.map((s) => (s.sp500Pb ? s.sp500Pb.toFixed(2) : null)),
      mono: true,
    },
    {
      label: "Div. Yield %",
      values: displaySnapshots.map((s) => (s.dividendYield ? s.dividendYield.toFixed(2) + "%" : null)),
      mono: true,
    },
    {
      label: "EPS Growth YoY",
      values: displaySnapshots.map((s) =>
        s.epsGrowthYoy !== null && s.epsGrowthYoy !== undefined
          ? fmtPct(s.epsGrowthYoy)
          : null
      ),
      mono: true,
    },
    {
      label: "CAPE Ratio",
      values: displaySnapshots.map((s) => (s.capeRatio ? s.capeRatio.toFixed(1) : null)),
      mono: true,
    },
    {
      label: "Composite Score",
      values: displaySnapshots.map((s) =>
        s.compositeScore !== null && s.compositeScore !== undefined ? s.compositeScore.toFixed(1) : null
      ),
      mono: true,
      getCellClass: (v: string | number | null | undefined) => {
        const n = typeof v === "string" ? parseFloat(v) : (v as number | null);
        if (!n) return "";
        if (n >= 7) return "cell-green";
        if (n >= 4) return "";
        if (n >= 2.5) return "cell-amber";
        return "cell-red";
      },
    },
    {
      label: "Mcap/GDP %",
      values: displaySnapshots.map((s) =>
        s.mcapGdp !== null && s.mcapGdp !== undefined ? s.mcapGdp.toFixed(1) + "%" : null
      ),
      mono: true,
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <VerdictCard
          label="PE (Trailing)"
          value={latest.sp500PeTrailing ? latest.sp500PeTrailing.toFixed(1) + "x" : "—"}
          subvalue={latest.capeRatio ? `CAPE: ${latest.capeRatio.toFixed(1)}x` : null}
          signal={peSignal(latest.sp500PeTrailing)}
          context="Trailing PE, one continuous series since 1871 — no methodology break."
        />
        <VerdictCard
          label="PB Ratio"
          value={latest.sp500Pb ? latest.sp500Pb.toFixed(2) + "x" : "—"}
          subvalue="Long-run median: 2.7x"
          signal={pbSignal(latest.sp500Pb)}
          context="Modern regime trades structurally above the long-run median — expected."
        />
        <VerdictCard
          label="Forward PE"
          value={latest.forwardPe ? latest.forwardPe.toFixed(1) + "x" : "—"}
          subvalue={latest.forwardPeZone ?? undefined}
          signal={latest.forwardPeZone ?? null}
          context="Manually updated from Yardeni/FactSet's free weekly research."
        />
        <VerdictCard
          label="EPS Growth YoY"
          value={latest.epsGrowthYoy !== null ? fmtPct(latest.epsGrowthYoy) : "—"}
          signal={
            latest.epsGrowthYoy !== null
              ? latest.epsGrowthYoy > 10
                ? "Buy"
                : latest.epsGrowthYoy > 0
                ? "Neutral"
                : "Caution"
              : null
          }
          context="Year-over-year S&P 500 aggregate earnings growth."
        />
        <VerdictCard
          label="US vs Ex-US Premium"
          value={latest.usVsExUsPremium !== null ? fmtPct(latest.usVsExUsPremium, 1) : "—"}
          signal={latest.usVsExUsSignal ?? null}
          context="SPY vs ACWX PE premium. Mirrors India's India-vs-EM tab."
        />
        <VerdictCard
          label="Forward ERP"
          value={latest.forwardErp !== null ? fmtPct(latest.forwardErp, 2) : "—"}
          signal={latest.erpSignal ?? null}
          context="Forward earnings yield minus 10Y Treasury yield."
        />
        <VerdictCard
          label="Mcap/GDP"
          value={latest.mcapGdp !== null ? latest.mcapGdp.toFixed(1) + "%" : "—"}
          subvalue={latest.mcapGdpZone ?? undefined}
          signal={mcapGdpSignal(latest.mcapGdp)}
          context="Buffett indicator, from World Bank official data. Structurally elevated vs. pre-2000s norms."
        />
        <VerdictCard
          label="Fund Flows (annual)"
          value={fmtFlow(latest.fundNetFlow)}
          signal={latest.fundNetFlow !== null ? (latest.fundNetFlow > 0 ? "Buy" : "Outflow") : null}
          context="Net long-term fund flows (ICI). US analogue of India's SIP."
        />
        <VerdictCard
          label="Foreign Net Flow (annual)"
          value={fmtFlow(latest.foreignNetFlow)}
          signal={latest.foreignNetFlow !== null ? (latest.foreignNetFlow > 0 ? "Buy" : "Outflow") : null}
          context="Net foreign purchases of US securities (Treasury TIC)."
        />
        <VerdictCard
          label="Composite Score"
          value={
            latest.compositeScore !== null ? latest.compositeScore.toFixed(1) + "/10" : "—"
          }
          subvalue={latest.compositeZone ?? undefined}
          signal={compositeSignal(latest.compositeScore)}
          context="10 signals, mirroring India's structure for cross-market comparison."
        />
      </div>

      <MarketNarrativeUS latest={latest} prev={prev} />
      <WatchListUS latest={latest} prev={prev} />

      <div>
        <h2 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wider">
          Historical Summary
        </h2>
        <DataTable years={years} rows={summaryRows} highlightYears={[]} />
      </div>
    </div>
  );
}
