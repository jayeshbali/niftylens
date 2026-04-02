"use client";

import type { MarketSnapshot } from "@/types";
import { DataTable, type TableRow } from "@/components/DataTable";
import { InfoCard } from "@/components/InfoCard";
import { metricExplanations } from "@/lib/content/metric-explanations";
import { SNAPSHOT_YEARS } from "@/lib/constants";

interface McapGDPTabProps {
  snapshots: MarketSnapshot[];
  view: "snapshot" | "full";
  latest: MarketSnapshot;
}

function mcapCellClass(v: string | number | null | undefined): string {
  const raw = typeof v === "string" ? parseFloat(v) : (v as number | null);
  if (raw === null || raw === undefined || isNaN(raw as number)) return "";
  if ((raw as number) < 70) return "cell-green";
  if ((raw as number) <= 90) return "";
  if ((raw as number) <= 110) return "cell-amber";
  return "cell-red";
}

export function McapGDPTab({ snapshots, view, latest }: McapGDPTabProps) {
  const displaySnapshots =
    view === "snapshot"
      ? snapshots.filter((s) => SNAPSHOT_YEARS.includes(s.year))
      : snapshots;

  const years = displaySnapshots.map((s) => s.year);

  const rows: TableRow[] = [
    {
      label: "Mcap/GDP %",
      values: displaySnapshots.map((s) => {
        if (s.mcapGdp === null || s.mcapGdp === undefined) return null;
        return s.mcapGdp.toFixed(1) + "%";
      }),
      mono: true,
      getCellClass: mcapCellClass,
    },
    {
      label: "Mcap/GDP Zone",
      values: displaySnapshots.map((s) => s.mcapGdpZone ?? null),
      mono: false,
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <InfoCard title={metricExplanations.mcapGdp.title} content={metricExplanations.mcapGdp} />
      <DataTable years={years} rows={rows} />

      <div className="flex flex-wrap gap-3 text-xs text-text-muted px-1">
        <span className="cell-green px-2 py-0.5 rounded">Below 70% — Attractive</span>
        <span className="px-2 py-0.5 rounded" style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
          70–90% — Normal
        </span>
        <span className="cell-amber px-2 py-0.5 rounded">90–110% — Caution</span>
        <span className="cell-red px-2 py-0.5 rounded">Above 110% — Stretched</span>
      </div>
    </div>
  );
}
