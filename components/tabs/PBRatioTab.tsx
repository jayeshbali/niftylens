"use client";

import type { MarketSnapshot } from "@/types";
import { DataTable, type TableRow } from "@/components/DataTable";
import { InfoCard } from "@/components/InfoCard";
import { metricExplanations } from "@/lib/content/metric-explanations";
import { SNAPSHOT_YEARS, PB_MEDIAN } from "@/lib/constants";

interface PBRatioTabProps {
  snapshots: MarketSnapshot[];
  view: "snapshot" | "full";
  latest: MarketSnapshot;
}

function pbCellClass(v: string | number | null | undefined): string {
  const n = typeof v === "string" ? parseFloat(v) : (v as number | null);
  if (n === null || n === undefined || isNaN(n as number)) return "";
  if ((n as number) < 2.75) return "cell-green";
  if ((n as number) <= 3.4) return "";
  if ((n as number) <= 4.5) return "cell-amber";
  return "cell-red";
}

export function PBRatioTab({ snapshots, view, latest }: PBRatioTabProps) {
  const displaySnapshots =
    view === "snapshot"
      ? snapshots.filter((s) => SNAPSHOT_YEARS.includes(s.year))
      : snapshots;

  const years = displaySnapshots.map((s) => s.year);

  const rows: TableRow[] = [
    {
      label: "PB Ratio",
      values: displaySnapshots.map((s) =>
        s.niftyPb !== null && s.niftyPb !== undefined ? s.niftyPb.toFixed(2) : null
      ),
      mono: true,
      getCellClass: pbCellClass,
    },
    {
      label: `Median (${PB_MEDIAN}x)`,
      values: displaySnapshots.map(() => PB_MEDIAN.toFixed(1)),
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
      <InfoCard title={metricExplanations.pb.title} content={metricExplanations.pb} />
      <DataTable years={years} rows={rows} />

      {/* Zone legend */}
      <div className="flex flex-wrap gap-3 text-xs text-text-muted px-1">
        <span className="cell-green px-2 py-0.5 rounded">Below 2.75 — Attractive</span>
        <span className="px-2 py-0.5 rounded" style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
          2.75–3.4 — Fair
        </span>
        <span className="cell-amber px-2 py-0.5 rounded">3.4–4.5 — Expensive</span>
        <span className="cell-red px-2 py-0.5 rounded">Above 4.5 — Stretched</span>
      </div>
    </div>
  );
}
