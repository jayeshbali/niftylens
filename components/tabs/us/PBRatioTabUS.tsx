"use client";

import type { UsMarketSnapshot } from "@/types";
import { DataTable, type TableRow } from "@/components/DataTable";
import { InfoCard } from "@/components/InfoCard";
import { metricExplanationsUS } from "@/lib/content/metric-explanations-us";
import { SNAPSHOT_YEARS_US, SP500_PB_MEDIAN } from "@/lib/constants-us";

interface PBRatioTabUSProps {
  snapshots: UsMarketSnapshot[];
  view: "snapshot" | "full";
  latest: UsMarketSnapshot;
}

function pbCellClass(v: string | number | null | undefined): string {
  const n = typeof v === "string" ? parseFloat(v) : (v as number | null);
  if (n === null || n === undefined || isNaN(n as number)) return "";
  if ((n as number) < 3.0) return "cell-green";
  if ((n as number) <= 4.0) return "";
  if ((n as number) <= 5.0) return "cell-amber";
  return "cell-red";
}

export function PBRatioTabUS({ snapshots, view, latest }: PBRatioTabUSProps) {
  const displaySnapshots =
    view === "snapshot" ? snapshots.filter((s) => SNAPSHOT_YEARS_US.includes(s.year)) : snapshots;

  const years = displaySnapshots.map((s) => s.year);

  const rows: TableRow[] = [
    {
      label: "PB Ratio",
      values: displaySnapshots.map((s) => (s.sp500Pb !== null ? s.sp500Pb.toFixed(2) : null)),
      mono: true,
      getCellClass: pbCellClass,
    },
    {
      label: `Long-run Median (${SP500_PB_MEDIAN}x)`,
      values: displaySnapshots.map(() => SP500_PB_MEDIAN.toFixed(1)),
      mono: true,
    },
    {
      label: "PB Zone",
      values: displaySnapshots.map((s) => s.pbZone ?? null),
      mono: false,
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <InfoCard title={metricExplanationsUS.pb.title} content={metricExplanationsUS.pb} />
      <DataTable years={years} rows={rows} highlightYears={[]} />

      <div className="flex flex-wrap gap-3 text-xs text-text-muted px-1">
        <span className="cell-green px-2 py-0.5 rounded">Below 3.0 — Attractive</span>
        <span className="px-2 py-0.5 rounded" style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
          3.0–4.0 — Fair
        </span>
        <span className="cell-amber px-2 py-0.5 rounded">4.0–5.0 — Expensive</span>
        <span className="cell-red px-2 py-0.5 rounded">Above 5.0 — Stretched</span>
      </div>
      <p className="text-xs text-text-muted px-1">
        Series only available from ~1978 onward on multpl.com.
      </p>
    </div>
  );
}
