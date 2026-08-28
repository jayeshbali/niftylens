"use client";

import type { UsMarketSnapshot } from "@/types";
import { DataTable, type TableRow } from "@/components/DataTable";
import { InfoCard } from "@/components/InfoCard";
import { metricExplanationsUS } from "@/lib/content/metric-explanations-us";
import { SNAPSHOT_YEARS_US, SP500_DY_MEDIAN } from "@/lib/constants-us";

interface DividendYieldTabUSProps {
  snapshots: UsMarketSnapshot[];
  view: "snapshot" | "full";
  latest: UsMarketSnapshot;
}

function dyCellClass(v: string | number | null | undefined): string {
  const raw = typeof v === "string" ? parseFloat(v) : (v as number | null);
  if (raw === null || raw === undefined || isNaN(raw as number)) return "";
  if ((raw as number) > 2.0) return "cell-green";
  if ((raw as number) >= 1.3) return "";
  return "cell-red";
}

export function DividendYieldTabUS({ snapshots, view, latest }: DividendYieldTabUSProps) {
  const displaySnapshots =
    view === "snapshot" ? snapshots.filter((s) => SNAPSHOT_YEARS_US.includes(s.year)) : snapshots;

  const years = displaySnapshots.map((s) => s.year);

  const rows: TableRow[] = [
    {
      label: "Dividend Yield %",
      values: displaySnapshots.map((s) =>
        s.dividendYield !== null ? s.dividendYield.toFixed(2) + "%" : null
      ),
      mono: true,
      getCellClass: dyCellClass,
    },
    {
      label: `Long-run Median (${SP500_DY_MEDIAN}%)`,
      values: displaySnapshots.map(() => SP500_DY_MEDIAN.toFixed(1) + "%"),
      mono: true,
    },
    {
      label: "DY Signal",
      values: displaySnapshots.map((s) => s.dySignal ?? null),
      mono: false,
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <InfoCard title={metricExplanationsUS.dy.title} content={metricExplanationsUS.dy} />
      <DataTable years={years} rows={rows} highlightYears={[]} />

      <p className="text-xs text-text-muted px-1">
        The long-run median (~4%) reflects a pre-1990s payout regime dominated by dividends
        over buybacks — not comparable to a modern reading. Zone thresholds above use the
        modern-regime range instead.
      </p>
    </div>
  );
}
