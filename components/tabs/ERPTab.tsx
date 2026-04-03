"use client";

import type { MarketSnapshot } from "@/types";
import { DataTable, type TableRow } from "@/components/DataTable";
import { InfoCard } from "@/components/InfoCard";
import { metricExplanations } from "@/lib/content/metric-explanations";
import { SNAPSHOT_YEARS } from "@/lib/constants";

interface ERPTabProps {
  snapshots: MarketSnapshot[];
  view: "snapshot" | "full";
  latest: MarketSnapshot;
}

function erpCellClass(v: string | number | null | undefined): string {
  // Values come in as "+1.00%" or "-1.80%" — parseFloat handles leading sign correctly
  const raw =
    typeof v === "string" ? parseFloat(v) : (v as number | null);
  if (raw === null || raw === undefined || isNaN(raw as number)) return "";
  if ((raw as number) > 1) return "cell-green";
  if ((raw as number) >= -0.5) return "cell-amber";
  return "cell-red";
}

function yieldCellClass(v: string | number | null | undefined): string {
  const raw = typeof v === "string" ? parseFloat(v) : (v as number | null);
  if (raw === null || raw === undefined || isNaN(raw as number)) return "";
  if ((raw as number) > 5) return "cell-green";
  if ((raw as number) > 4) return "";
  if ((raw as number) > 3) return "cell-amber";
  return "cell-red";
}

export function ERPTab({ snapshots, view, latest }: ERPTabProps) {
  const displaySnapshots =
    view === "snapshot"
      ? snapshots.filter((s) => SNAPSHOT_YEARS.includes(s.year))
      : snapshots;

  const years = displaySnapshots.map((s) => s.year);

  const rows: TableRow[] = [
    {
      label: "10Y Bond Yield %",
      values: displaySnapshots.map((s) =>
        s.bondYield10y !== null && s.bondYield10y !== undefined
          ? s.bondYield10y.toFixed(2) + "%"
          : null
      ),
      mono: true,
    },
    {
      label: "Trailing Earnings Yield %",
      values: displaySnapshots.map((s) => {
        if (s.trailingEarningsYield === null || s.trailingEarningsYield === undefined) return null;
        return s.trailingEarningsYield.toFixed(2) + "%";
      }),
      mono: true,
      getCellClass: yieldCellClass,
    },
    {
      label: "Forward Earnings Yield %",
      values: displaySnapshots.map((s) => {
        if (s.forwardEarningsYield === null || s.forwardEarningsYield === undefined) return null;
        return s.forwardEarningsYield.toFixed(2) + "%";
      }),
      mono: true,
      getCellClass: yieldCellClass,
    },
    {
      label: "Trailing ERP %",
      values: displaySnapshots.map((s) => {
        if (s.trailingErp === null || s.trailingErp === undefined) return null;
        return (s.trailingErp >= 0 ? "+" : "") + s.trailingErp.toFixed(2) + "%";
      }),
      mono: true,
      getCellClass: erpCellClass,
    },
    {
      label: "Forward ERP %",
      values: displaySnapshots.map((s) => {
        if (s.forwardErp === null || s.forwardErp === undefined) return null;
        return (s.forwardErp >= 0 ? "+" : "") + s.forwardErp.toFixed(2) + "%";
      }),
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
      <InfoCard title={metricExplanations.erp.title} content={metricExplanations.erp} />
      <DataTable years={years} rows={rows} />

      <div className="flex flex-wrap gap-3 text-xs text-text-muted px-1">
        <span className="cell-green px-2 py-0.5 rounded">ERP above 3% — Attractive</span>
        <span className="px-2 py-0.5 rounded" style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
          1–3% — Normal
        </span>
        <span className="cell-amber px-2 py-0.5 rounded">0–1% — Tight</span>
        <span className="cell-red px-2 py-0.5 rounded">Negative — Bonds Win</span>
      </div>
    </div>
  );
}
