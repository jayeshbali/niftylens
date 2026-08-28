"use client";

import type { UsMarketSnapshot } from "@/types";
import { DataTable, type TableRow } from "@/components/DataTable";
import { InfoCard } from "@/components/InfoCard";
import { metricExplanationsUS } from "@/lib/content/metric-explanations-us";
import { SNAPSHOT_YEARS_US } from "@/lib/constants-us";

interface EPSGrowthTabUSProps {
  snapshots: UsMarketSnapshot[];
  view: "snapshot" | "full";
  latest: UsMarketSnapshot;
}

function growthCellClass(v: string | number | null | undefined): string {
  const raw = typeof v === "string" ? parseFloat(v) : (v as number | null);
  if (raw === null || raw === undefined || isNaN(raw as number)) return "";
  if ((raw as number) > 15) return "cell-green";
  if ((raw as number) > 0) return "";
  return "cell-red";
}

export function EPSGrowthTabUS({ snapshots, view, latest }: EPSGrowthTabUSProps) {
  const displaySnapshots =
    view === "snapshot" ? snapshots.filter((s) => SNAPSHOT_YEARS_US.includes(s.year)) : snapshots;

  const years = displaySnapshots.map((s) => s.year);

  const rows: TableRow[] = [
    {
      label: "S&P 500 Level",
      values: displaySnapshots.map((s) =>
        s.sp500Level !== null ? Math.round(s.sp500Level).toLocaleString("en-US") : null
      ),
      mono: true,
    },
    {
      label: "Earnings (index pts)",
      values: displaySnapshots.map((s) => (s.sp500Eps !== null ? s.sp500Eps.toFixed(2) : null)),
      mono: true,
    },
    {
      label: "EPS Growth YoY %",
      values: displaySnapshots.map((s) =>
        s.epsGrowthYoy !== null ? (s.epsGrowthYoy >= 0 ? "+" : "") + s.epsGrowthYoy.toFixed(1) + "%" : null
      ),
      mono: true,
      getCellClass: growthCellClass,
    },
    {
      label: "EPS 3Y CAGR %",
      values: displaySnapshots.map((s) =>
        s.eps3yCagr !== null ? (s.eps3yCagr >= 0 ? "+" : "") + s.eps3yCagr.toFixed(1) + "%" : null
      ),
      mono: true,
      getCellClass: growthCellClass,
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <InfoCard title={metricExplanationsUS.eps.title} content={metricExplanationsUS.eps} />
      <DataTable years={years} rows={rows} highlightYears={[]} />

      <p className="text-xs text-text-muted px-1">
        Earnings are Shiller's “as reported” S&amp;P 500 aggregate earnings, expressed in
        index points (not a per-share dollar figure). 3Y CAGR smooths single-year distortions
        (e.g. 2008–09, 2020 base effects).
      </p>
    </div>
  );
}
