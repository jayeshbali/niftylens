"use client";

import type { MarketSnapshot } from "@/types";
import { DataTable, type TableRow } from "@/components/DataTable";
import { InfoCard } from "@/components/InfoCard";
import { metricExplanations } from "@/lib/content/metric-explanations";
import { SNAPSHOT_YEARS } from "@/lib/constants";

interface EPSGrowthTabProps {
  snapshots: MarketSnapshot[];
  view: "snapshot" | "full";
  latest: MarketSnapshot;
}

function growthCellClass(v: string | number | null | undefined): string {
  const raw = typeof v === "string" ? parseFloat(v) : (v as number | null);
  if (raw === null || raw === undefined || isNaN(raw as number)) return "";
  if ((raw as number) > 15) return "cell-green";
  if ((raw as number) > 0) return "";
  return "cell-red";
}

export function EPSGrowthTab({ snapshots, view, latest }: EPSGrowthTabProps) {
  const displaySnapshots =
    view === "snapshot"
      ? snapshots.filter((s) => SNAPSHOT_YEARS.includes(s.year))
      : snapshots;

  const years = displaySnapshots.map((s) => s.year);

  const rows: TableRow[] = [
    {
      label: "Nifty Level",
      values: displaySnapshots.map((s) =>
        s.niftyLevel !== null && s.niftyLevel !== undefined
          ? Math.round(s.niftyLevel).toLocaleString("en-IN")
          : null
      ),
      mono: true,
    },
    {
      label: "EPS (INR)",
      values: displaySnapshots.map((s) =>
        s.niftyEps !== null && s.niftyEps !== undefined
          ? Math.round(s.niftyEps).toLocaleString("en-IN")
          : null
      ),
      mono: true,
    },
    {
      label: "EPS Growth YoY %",
      values: displaySnapshots.map((s) => {
        if (s.epsGrowthYoy === null || s.epsGrowthYoy === undefined) return null;
        return (s.epsGrowthYoy >= 0 ? "+" : "") + s.epsGrowthYoy.toFixed(1) + "%";
      }),
      mono: true,
      getCellClass: growthCellClass,
    },
    {
      label: "EPS 3Y CAGR %",
      values: displaySnapshots.map((s) => {
        if (s.eps3yCagr === null || s.eps3yCagr === undefined) return null;
        return (s.eps3yCagr >= 0 ? "+" : "") + s.eps3yCagr.toFixed(1) + "%";
      }),
      mono: true,
      getCellClass: growthCellClass,
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <InfoCard title={metricExplanations.eps.title} content={metricExplanations.eps} />
      <DataTable years={years} rows={rows} />

      <p className="text-xs text-text-muted px-1">
        EPS is derived: Nifty Level ÷ Published PE. Not NSE&apos;s official EPS figure.
        3Y CAGR smooths out single-year distortions (e.g. COVID base effects).
      </p>
    </div>
  );
}
