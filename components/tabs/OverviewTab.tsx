"use client";

import type { MarketSnapshot } from "@/types";
import { VerdictCard } from "@/components/VerdictCard";
import { DataTable } from "@/components/DataTable";
import { InfoCard } from "@/components/InfoCard";
import { metricExplanations } from "@/lib/content/metric-explanations";
import { SNAPSHOT_YEARS } from "@/lib/constants";

interface OverviewTabProps {
  snapshots: MarketSnapshot[];
  view: "snapshot" | "full";
  latest: MarketSnapshot;
}

function fmtPe(v: number | null): string {
  if (v === null || v === undefined) return "—";
  return v.toFixed(1) + "x";
}

function fmtPct(v: number | null, decimals = 1): string {
  if (v === null || v === undefined) return "—";
  return (v >= 0 ? "+" : "") + v.toFixed(decimals) + "%";
}

function fmtFlow(v: number | null): string {
  if (v === null || v === undefined) return "—";
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "+";
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(1)}L Cr`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(0)}K Cr`;
  return `${sign}₹${abs.toFixed(0)} Cr`;
}

function compositeSignal(score: number | null): string {
  if (score === null || score === undefined) return "—";
  if (score >= 7) return "Attractive";
  if (score >= 5.5) return "Neutral";
  if (score >= 4) return "Caution";
  if (score >= 2.5) return "Rich";
  return "Danger";
}

function peSignal(pe: number | null): string {
  if (pe === null || pe === undefined) return "—";
  if (pe < 17) return "Attractive";
  if (pe <= 22) return "Neutral";
  if (pe <= 24) return "Caution";
  return "Danger";
}

function pbSignal(pb: number | null): string {
  if (pb === null || pb === undefined) return "—";
  if (pb < 2.75) return "Attractive";
  if (pb <= 3.4) return "Neutral";
  if (pb <= 4.5) return "Caution";
  return "Danger";
}

function dySignalFn(dy: number | null): string {
  if (dy === null || dy === undefined) return "—";
  if (dy > 1.8) return "Attractive";
  if (dy >= 1.3) return "Neutral";
  if (dy >= 1.0) return "Caution";
  return "Danger";
}

function mcapGdpSignal(v: number | null): string | null {
  if (v === null || v === undefined) return null;
  if (v < 70) return "Attractive";
  if (v <= 90) return "Neutral";
  if (v <= 110) return "Caution";
  return "Danger";
}

export function OverviewTab({ snapshots, view, latest }: OverviewTabProps) {
  const displaySnapshots =
    view === "snapshot"
      ? snapshots.filter((s) => SNAPSHOT_YEARS.includes(s.year))
      : snapshots;

  const years = displaySnapshots.map((s) => s.year);

  // Build summary table rows
  const summaryRows = [
    {
      label: "Nifty Level",
      values: displaySnapshots.map((s) =>
        s.niftyLevel ? Math.round(s.niftyLevel).toLocaleString("en-IN") : null
      ),
      mono: true,
    },
    {
      label: "PE Standalone",
      values: displaySnapshots.map((s) =>
        s.niftyPeStandalone ? s.niftyPeStandalone.toFixed(1) : null
      ),
      mono: true,
      getCellClass: (v: string | number | null | undefined) => {
        const n = typeof v === "string" ? parseFloat(v) : (v as number | null);
        if (!n) return "";
        if (n < 17) return "cell-green";
        if (n <= 22) return "";
        if (n <= 24) return "cell-amber";
        return "cell-red";
      },
    },
    {
      label: "PB Ratio",
      values: displaySnapshots.map((s) =>
        s.niftyPb ? s.niftyPb.toFixed(2) : null
      ),
      mono: true,
      getCellClass: (v: string | number | null | undefined) => {
        const n = typeof v === "string" ? parseFloat(v) : (v as number | null);
        if (!n) return "";
        if (n < 2.75) return "cell-green";
        if (n <= 3.4) return "";
        if (n <= 4.5) return "cell-amber";
        return "cell-red";
      },
    },
    {
      label: "Div. Yield %",
      values: displaySnapshots.map((s) =>
        s.dividendYield ? s.dividendYield.toFixed(2) + "%" : null
      ),
      mono: true,
      getCellClass: (v: string | number | null | undefined) => {
        const raw = typeof v === "string" ? parseFloat(v) : (v as number | null);
        if (!raw) return "";
        if (raw > 1.8) return "cell-green";
        if (raw >= 1.3) return "";
        if (raw >= 1.0) return "cell-amber";
        return "cell-red";
      },
    },
    {
      label: "EPS Growth YoY",
      values: displaySnapshots.map((s) =>
        s.epsGrowthYoy !== null && s.epsGrowthYoy !== undefined
          ? (s.epsGrowthYoy >= 0 ? "+" : "") + s.epsGrowthYoy.toFixed(1) + "%"
          : null
      ),
      mono: true,
      getCellClass: (v: string | number | null | undefined) => {
        const raw = typeof v === "string" ? parseFloat(v) : (v as number | null);
        if (raw === null || raw === undefined) return "";
        if (raw > 15) return "cell-green";
        if (raw > 0) return "";
        return "cell-red";
      },
    },
    {
      label: "Composite Score",
      values: displaySnapshots.map((s) =>
        s.compositeScore !== null && s.compositeScore !== undefined
          ? s.compositeScore.toFixed(1)
          : null
      ),
      mono: true,
      getCellClass: (v: string | number | null | undefined) => {
        const n = typeof v === "string" ? parseFloat(v) : (v as number | null);
        if (!n) return "";
        if (n >= 7) return "cell-green";
        if (n >= 5.5) return "";
        if (n >= 4) return "cell-amber";
        if (n >= 2.5) return "cell-orange";
        return "cell-red";
      },
    },
    {
      label: "1Y Forward Return",
      values: displaySnapshots.map((s) =>
        s.nifty1yForwardReturn !== null && s.nifty1yForwardReturn !== undefined
          ? (s.nifty1yForwardReturn >= 0 ? "+" : "") +
            s.nifty1yForwardReturn.toFixed(1) +
            "%"
          : null
      ),
      mono: true,
      getCellClass: (v: string | number | null | undefined) => {
        const raw = typeof v === "string" ? parseFloat(v) : (v as number | null);
        if (raw === null || raw === undefined) return "";
        if (raw > 30) return "cell-green";
        if (raw >= 0) return "";
        return "cell-red";
      },
    },
    {
      label: "Mcap/GDP %",
      values: displaySnapshots.map((s) =>
        s.mcapGdp !== null && s.mcapGdp !== undefined
          ? s.mcapGdp.toFixed(1) + "%"
          : null
      ),
      mono: true,
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <InfoCard title={metricExplanations.overview.title} content={metricExplanations.overview} />

      {/* Verdict Cards Grid */}
      <div>
        <h2 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wider">
          Current Market Snapshot
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <VerdictCard
            label="PE Standalone Equiv"
            value={latest.niftyPeStandalone ? latest.niftyPeStandalone.toFixed(1) + "x" : "—"}
            subvalue={
              latest.niftyPePublished
                ? `Published: ${latest.niftyPePublished.toFixed(1)}x`
                : null
            }
            signal={peSignal(latest.niftyPeStandalone)}
            context="Adjusted PE vs 22x historical median. Above 24x = historically poor 3Y returns."
          />
          <VerdictCard
            label="PB Ratio"
            value={latest.niftyPb ? latest.niftyPb.toFixed(2) + "x" : "—"}
            subvalue="Median: 3.4x"
            signal={pbSignal(latest.niftyPb)}
            context="Price-to-book. Consistent 26-year series unaffected by methodology changes."
          />
          <VerdictCard
            label="Forward PE"
            value={latest.forwardPe ? latest.forwardPe.toFixed(1) + "x" : "—"}
            subvalue={latest.forwardPeZone ?? undefined}
            signal={latest.forwardPeZone ?? null}
            context="Based on next 12-month consensus earnings. Sub-18x historically = good entry."
          />
          <VerdictCard
            label="EPS Growth YoY"
            value={
              latest.epsGrowthYoy !== null && latest.epsGrowthYoy !== undefined
                ? fmtPct(latest.epsGrowthYoy)
                : "—"
            }
            signal={
              latest.epsGrowthYoy !== null && latest.epsGrowthYoy !== undefined
                ? latest.epsGrowthYoy > 15
                  ? "Buy"
                  : latest.epsGrowthYoy > 0
                  ? "Neutral"
                  : "Caution"
                : null
            }
            context="Year-over-year Nifty 50 EPS growth. Consensus FY27 expects ~14% recovery."
          />
          <VerdictCard
            label="India vs EM Premium"
            value={
              latest.indiaVsEmPremium !== null && latest.indiaVsEmPremium !== undefined
                ? fmtPct(latest.indiaVsEmPremium, 1)
                : "—"
            }
            signal={latest.indiaVsEmSignal ?? null}
            context="MSCI India vs EM PE premium. 60–80% = stretched. 20–30% = constructive."
          />
          <VerdictCard
            label="Forward ERP"
            value={
              latest.forwardErp !== null && latest.forwardErp !== undefined
                ? fmtPct(latest.forwardErp, 2)
                : "—"
            }
            signal={latest.erpSignal ?? null}
            context="Forward earnings yield minus 10Y bond yield. Equity premium over risk-free."
          />
          <VerdictCard
            label="Mcap/GDP"
            value={
              latest.mcapGdp !== null && latest.mcapGdp !== undefined
                ? latest.mcapGdp.toFixed(1) + "%"
                : "—"
            }
            subvalue={latest.mcapGdpZone ?? undefined}
            signal={mcapGdpSignal(latest.mcapGdp)}
            context='Buffett indicator. India median ~80%. Structural upward bias — use trend context.'
          />
          <VerdictCard
            label="SIP Monthly Avg"
            value={
              latest.sipMonthlyAvg !== null && latest.sipMonthlyAvg !== undefined
                ? `₹${(latest.sipMonthlyAvg / 1000).toFixed(0)}K Cr`
                : "—"
            }
            signal="Neutral"
            context="Monthly SIP run-rate. Structural floor for markets. 8× growth since FY17."
          />
          <VerdictCard
            label="FII Net Flow (FY)"
            value={fmtFlow(latest.fiiNet)}
            signal={
              latest.fiiNet !== null && latest.fiiNet !== undefined
                ? latest.fiiNet > 0
                  ? "Buy"
                  : "Caution"
                : null
            }
            context="Net FII flows this fiscal year. Positive = foreign buying; negative = selling."
          />
          <VerdictCard
            label="Composite Score"
            value={
              latest.compositeScore !== null && latest.compositeScore !== undefined
                ? latest.compositeScore.toFixed(1) + "/10"
                : "—"
            }
            subvalue={latest.compositeZone ?? undefined}
            signal={compositeSignal(latest.compositeScore)}
            context="10 signals synthesised. 7+ = historically preceded big rallies."
          />
        </div>
      </div>

      {/* Summary Table */}
      <div>
        <h2 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wider">
          Historical Summary
        </h2>
        <DataTable years={years} rows={summaryRows} />
      </div>
    </div>
  );
}
