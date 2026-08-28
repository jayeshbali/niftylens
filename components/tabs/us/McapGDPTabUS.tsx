"use client";

import type { UsMarketSnapshot } from "@/types";
import { DataTable, type TableRow } from "@/components/DataTable";
import { InfoCard } from "@/components/InfoCard";
import { metricExplanationsUS } from "@/lib/content/metric-explanations-us";
import { SNAPSHOT_YEARS_US } from "@/lib/constants-us";

interface McapGDPTabUSProps {
  snapshots: UsMarketSnapshot[];
  view: "snapshot" | "full";
  latest: UsMarketSnapshot;
}

function mcapCellClass(v: string | number | null | undefined): string {
  const raw = typeof v === "string" ? parseFloat(v) : (v as number | null);
  if (raw === null || raw === undefined || isNaN(raw as number)) return "";
  if ((raw as number) < 100) return "cell-green";
  if ((raw as number) <= 150) return "";
  return "cell-red";
}

export function McapGDPTabUS({ snapshots, view, latest }: McapGDPTabUSProps) {
  const displaySnapshots =
    view === "snapshot" ? snapshots.filter((s) => SNAPSHOT_YEARS_US.includes(s.year)) : snapshots;

  const years = displaySnapshots.map((s) => s.year);

  const rows: TableRow[] = [
    {
      label: "Mcap/GDP %",
      values: displaySnapshots.map((s) => (s.mcapGdp !== null ? s.mcapGdp.toFixed(1) + "%" : null)),
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
      <InfoCard title={metricExplanationsUS.mcapGdp.title} content={metricExplanationsUS.mcapGdp} />
      <DataTable years={years} rows={rows} highlightYears={[]} />

      <div className="flex flex-wrap gap-3 text-xs text-text-muted px-1">
        <span className="cell-green px-2 py-0.5 rounded">Below 100% — Attractive</span>
        <span className="px-2 py-0.5 rounded" style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
          100–150% — Normal (modern regime)
        </span>
        <span className="cell-red px-2 py-0.5 rounded">Above 150% — Stretched</span>
      </div>
      <p className="text-xs text-text-muted px-1">
        Sourced directly from the World Bank's official ratio — annual, several months' lag.
      </p>
    </div>
  );
}
