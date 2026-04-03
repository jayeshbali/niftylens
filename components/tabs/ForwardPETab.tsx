"use client";

import type { MarketSnapshot } from "@/types";
import { DataTable, type TableRow } from "@/components/DataTable";
import { InfoCard } from "@/components/InfoCard";
import { metricExplanations } from "@/lib/content/metric-explanations";
import { SNAPSHOT_YEARS } from "@/lib/constants";

interface ForwardPETabProps {
  snapshots: MarketSnapshot[];
  view: "snapshot" | "full";
  latest: MarketSnapshot;
}

function forwardPeCellClass(v: string | number | null | undefined): string {
  const n = typeof v === "string" ? parseFloat(v) : (v as number | null);
  if (n === null || n === undefined || isNaN(n as number)) return "";
  if ((n as number) < 16) return "cell-green";
  if ((n as number) <= 20) return "";
  if ((n as number) <= 24) return "cell-amber";
  return "cell-red";
}

export function ForwardPETab({ snapshots, view, latest }: ForwardPETabProps) {
  const displaySnapshots =
    view === "snapshot"
      ? snapshots.filter((s) => SNAPSHOT_YEARS.includes(s.year))
      : snapshots;

  const years = displaySnapshots.map((s) => s.year);

  const rows: TableRow[] = [
    {
      label: "Trailing PE (Standalone)",
      values: displaySnapshots.map((s) =>
        s.niftyPeStandalone !== null && s.niftyPeStandalone !== undefined
          ? s.niftyPeStandalone.toFixed(1)
          : null
      ),
      mono: true,
      getCellClass: (v) => {
        const n = typeof v === "string" ? parseFloat(v) : (v as number | null);
        if (n === null || n === undefined || isNaN(n as number)) return "";
        if ((n as number) < 17) return "cell-green";
        if ((n as number) <= 22) return "";
        if ((n as number) <= 24) return "cell-amber";
        return "cell-red";
      },
    },
    {
      label: "Forward PE",
      values: displaySnapshots.map((s) =>
        s.forwardPe !== null && s.forwardPe !== undefined
          ? s.forwardPe.toFixed(1)
          : null
      ),
      mono: true,
      getCellClass: forwardPeCellClass,
    },
    {
      label: "Forward PE Zone",
      values: displaySnapshots.map((s) => s.forwardPeZone ?? null),
      mono: false,
    },
    {
      label: "Implied EPS Growth %",
      values: displaySnapshots.map((s) => {
        if (s.impliedEpsGrowth === null || s.impliedEpsGrowth === undefined) return null;
        return (s.impliedEpsGrowth >= 0 ? "+" : "") + s.impliedEpsGrowth.toFixed(1) + "%";
      }),
      mono: true,
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <InfoCard title={metricExplanations.forwardPe.title} content={metricExplanations.forwardPe} />
      <DataTable years={years} rows={rows} />

      <div className="flex flex-wrap gap-3 text-xs text-text-muted px-1">
        <span className="cell-green px-2 py-0.5 rounded">Below 16x — Attractive</span>
        <span className="px-2 py-0.5 rounded" style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
          16–20x — Fair
        </span>
        <span className="cell-amber px-2 py-0.5 rounded">20–24x — Expensive</span>
        <span className="cell-red px-2 py-0.5 rounded">Above 24x — Danger</span>
      </div>
    </div>
  );
}
