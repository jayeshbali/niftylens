"use client";

import type { UsMarketSnapshot } from "@/types";
import { DataTable, type TableRow } from "@/components/DataTable";
import { InfoCard } from "@/components/InfoCard";
import { metricExplanationsUS } from "@/lib/content/metric-explanations-us";
import { SNAPSHOT_YEARS_US } from "@/lib/constants-us";

interface ForwardPETabUSProps {
  snapshots: UsMarketSnapshot[];
  view: "snapshot" | "full";
  latest: UsMarketSnapshot;
}

function forwardPeCellClass(v: string | number | null | undefined): string {
  const n = typeof v === "string" ? parseFloat(v) : (v as number | null);
  if (n === null || n === undefined || isNaN(n as number)) return "";
  if ((n as number) < 17) return "cell-green";
  if ((n as number) <= 21) return "";
  return "cell-red";
}

export function ForwardPETabUS({ snapshots, view, latest }: ForwardPETabUSProps) {
  const displaySnapshots =
    view === "snapshot" ? snapshots.filter((s) => SNAPSHOT_YEARS_US.includes(s.year)) : snapshots;

  const years = displaySnapshots.map((s) => s.year);

  const rows: TableRow[] = [
    {
      label: "Trailing PE",
      values: displaySnapshots.map((s) => (s.sp500PeTrailing !== null ? s.sp500PeTrailing.toFixed(1) : null)),
      mono: true,
    },
    {
      label: "Forward PE",
      values: displaySnapshots.map((s) => (s.forwardPe !== null ? s.forwardPe.toFixed(1) : null)),
      mono: true,
      getCellClass: forwardPeCellClass,
    },
    {
      label: "Forward PE Zone",
      values: displaySnapshots.map((s) => s.forwardPeZone ?? null),
      mono: false,
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <InfoCard title={metricExplanationsUS.forwardPe.title} content={metricExplanationsUS.forwardPe} />
      <DataTable years={years} rows={rows} highlightYears={[]} />

      <div className="flex flex-wrap gap-3 text-xs text-text-muted px-1">
        <span className="cell-green px-2 py-0.5 rounded">Below 17x — Attractive</span>
        <span className="px-2 py-0.5 rounded" style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
          17–21x — Fair
        </span>
        <span className="cell-red px-2 py-0.5 rounded">Above 21x — Expensive</span>
      </div>
      <p className="text-xs text-text-muted px-1">
        No free programmatic API exists for S&amp;P 500 forward PE — updated manually via
        POST /api/admin/us-forward-pe from Yardeni Research or FactSet's free weekly research.
      </p>
    </div>
  );
}
