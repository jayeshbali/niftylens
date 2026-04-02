"use client";

import type { MarketSnapshot } from "@/types";
import { DataTable, type TableRow } from "@/components/DataTable";
import { InfoCard } from "@/components/InfoCard";
import { metricExplanations } from "@/lib/content/metric-explanations";
import { SNAPSHOT_YEARS } from "@/lib/constants";

interface IndiaVsEMTabProps {
  snapshots: MarketSnapshot[];
  view: "snapshot" | "full";
  latest: MarketSnapshot;
}

function premiumCellClass(v: string | number | null | undefined): string {
  const raw = typeof v === "string" ? parseFloat(v) : (v as number | null);
  if (raw === null || raw === undefined || isNaN(raw as number)) return "";
  if ((raw as number) < 20) return "cell-green";
  if ((raw as number) <= 40) return "";
  if ((raw as number) <= 65) return "cell-amber";
  return "cell-red";
}

export function IndiaVsEMTab({ snapshots, view, latest }: IndiaVsEMTabProps) {
  const displaySnapshots =
    view === "snapshot"
      ? snapshots.filter((s) => SNAPSHOT_YEARS.includes(s.year))
      : snapshots;

  const years = displaySnapshots.map((s) => s.year);

  const rows: TableRow[] = [
    {
      label: "MSCI India PE",
      values: displaySnapshots.map((s) =>
        s.msciIndiaPe !== null && s.msciIndiaPe !== undefined
          ? s.msciIndiaPe.toFixed(1)
          : null
      ),
      mono: true,
    },
    {
      label: "MSCI EM PE",
      values: displaySnapshots.map((s) =>
        s.msciEmPe !== null && s.msciEmPe !== undefined
          ? s.msciEmPe.toFixed(1)
          : null
      ),
      mono: true,
    },
    {
      label: "India vs EM Premium %",
      values: displaySnapshots.map((s) => {
        if (s.indiaVsEmPremium === null || s.indiaVsEmPremium === undefined) return null;
        return (s.indiaVsEmPremium >= 0 ? "+" : "") + s.indiaVsEmPremium.toFixed(1) + "%";
      }),
      mono: true,
      getCellClass: premiumCellClass,
    },
    {
      label: "Signal",
      values: displaySnapshots.map((s) => s.indiaVsEmSignal ?? null),
      mono: false,
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <InfoCard title={metricExplanations.indiaVsEm.title} content={metricExplanations.indiaVsEm} />
      <DataTable years={years} rows={rows} />

      <div className="flex flex-wrap gap-3 text-xs text-text-muted px-1">
        <span className="cell-green px-2 py-0.5 rounded">Below 20% — Attractive</span>
        <span className="px-2 py-0.5 rounded" style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
          20–40% — Fair
        </span>
        <span className="cell-amber px-2 py-0.5 rounded">40–65% — Caution</span>
        <span className="cell-red px-2 py-0.5 rounded">Above 65% — Stretched</span>
      </div>
    </div>
  );
}
