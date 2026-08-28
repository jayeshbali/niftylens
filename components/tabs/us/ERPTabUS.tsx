"use client";

import type { UsMarketSnapshot } from "@/types";
import { DataTable, type TableRow } from "@/components/DataTable";
import { InfoCard } from "@/components/InfoCard";
import { metricExplanationsUS } from "@/lib/content/metric-explanations-us";
import { SNAPSHOT_YEARS_US } from "@/lib/constants-us";

interface ERPTabUSProps {
  snapshots: UsMarketSnapshot[];
  view: "snapshot" | "full";
  latest: UsMarketSnapshot;
}

function erpCellClass(v: string | number | null | undefined): string {
  const raw = typeof v === "string" ? parseFloat(v) : (v as number | null);
  if (raw === null || raw === undefined || isNaN(raw as number)) return "";
  if ((raw as number) > 1) return "cell-green";
  if ((raw as number) >= -0.5) return "cell-amber";
  return "cell-red";
}

export function ERPTabUS({ snapshots, view, latest }: ERPTabUSProps) {
  const displaySnapshots =
    view === "snapshot" ? snapshots.filter((s) => SNAPSHOT_YEARS_US.includes(s.year)) : snapshots;

  const years = displaySnapshots.map((s) => s.year);

  const rows: TableRow[] = [
    {
      label: "10Y Treasury Yield %",
      values: displaySnapshots.map((s) => (s.bondYield10y !== null ? s.bondYield10y.toFixed(2) + "%" : null)),
      mono: true,
    },
    {
      label: "Trailing Earnings Yield %",
      values: displaySnapshots.map((s) =>
        s.trailingEarningsYield !== null ? s.trailingEarningsYield.toFixed(2) + "%" : null
      ),
      mono: true,
    },
    {
      label: "Forward Earnings Yield %",
      values: displaySnapshots.map((s) =>
        s.forwardEarningsYield !== null ? s.forwardEarningsYield.toFixed(2) + "%" : null
      ),
      mono: true,
    },
    {
      label: "Trailing ERP %",
      values: displaySnapshots.map((s) =>
        s.trailingErp !== null ? (s.trailingErp >= 0 ? "+" : "") + s.trailingErp.toFixed(2) + "%" : null
      ),
      mono: true,
      getCellClass: erpCellClass,
    },
    {
      label: "Forward ERP %",
      values: displaySnapshots.map((s) =>
        s.forwardErp !== null ? (s.forwardErp >= 0 ? "+" : "") + s.forwardErp.toFixed(2) + "%" : null
      ),
      mono: true,
      getCellClass: erpCellClass,
    },
    {
      label: "Net Signal",
      values: displaySnapshots.map((s) => s.erpSignal ?? null),
      mono: false,
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <InfoCard title={metricExplanationsUS.erp.title} content={metricExplanationsUS.erp} />
      <DataTable years={years} rows={rows} highlightYears={[]} />

      <div className="flex flex-wrap gap-3 text-xs text-text-muted px-1">
        <span className="cell-green px-2 py-0.5 rounded">ERP above 1% — Attractive</span>
        <span className="cell-amber px-2 py-0.5 rounded">-0.5% to 1% — Tight</span>
        <span className="cell-red px-2 py-0.5 rounded">Below -0.5% — Bonds Win</span>
      </div>
    </div>
  );
}
