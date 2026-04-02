"use client";

import type { MarketSnapshot } from "@/types";
import { DataTable, type TableRow } from "@/components/DataTable";
import { InfoCard } from "@/components/InfoCard";
import { metricExplanations } from "@/lib/content/metric-explanations";
import { SNAPSHOT_YEARS, DY_MEDIAN } from "@/lib/constants";

interface DividendYieldTabProps {
  snapshots: MarketSnapshot[];
  view: "snapshot" | "full";
  latest: MarketSnapshot;
}

function dyCellClass(v: string | number | null | undefined): string {
  const raw = typeof v === "string" ? parseFloat(v) : (v as number | null);
  if (raw === null || raw === undefined || isNaN(raw as number)) return "";
  if ((raw as number) > 1.8) return "cell-green";
  if ((raw as number) >= 1.3) return "";
  if ((raw as number) >= 1.0) return "cell-amber";
  return "cell-red";
}

export function DividendYieldTab({ snapshots, view, latest }: DividendYieldTabProps) {
  const displaySnapshots =
    view === "snapshot"
      ? snapshots.filter((s) => SNAPSHOT_YEARS.includes(s.year))
      : snapshots;

  const years = displaySnapshots.map((s) => s.year);

  const rows: TableRow[] = [
    {
      label: "Dividend Yield %",
      values: displaySnapshots.map((s) =>
        s.dividendYield !== null && s.dividendYield !== undefined
          ? s.dividendYield.toFixed(2) + "%"
          : null
      ),
      mono: true,
      getCellClass: dyCellClass,
    },
    {
      label: `DY Median (${DY_MEDIAN}%)`,
      values: displaySnapshots.map(() => DY_MEDIAN.toFixed(1) + "%"),
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
      <InfoCard title={metricExplanations.dy.title} content={metricExplanations.dy} />
      <DataTable years={years} rows={rows} />

      <div className="flex flex-wrap gap-3 text-xs text-text-muted px-1">
        <span className="cell-green px-2 py-0.5 rounded">Above 1.8% — Strong Buy</span>
        <span className="px-2 py-0.5 rounded" style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
          1.3–1.8% — Neutral
        </span>
        <span className="cell-amber px-2 py-0.5 rounded">1.0–1.3% — Caution</span>
        <span className="cell-red px-2 py-0.5 rounded">Below 1.0% — Danger</span>
      </div>
    </div>
  );
}
