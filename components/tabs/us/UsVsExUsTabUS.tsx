"use client";

import type { UsMarketSnapshot } from "@/types";
import { DataTable, type TableRow } from "@/components/DataTable";
import { InfoCard } from "@/components/InfoCard";
import { metricExplanationsUS } from "@/lib/content/metric-explanations-us";
import { SNAPSHOT_YEARS_US } from "@/lib/constants-us";

interface UsVsExUsTabUSProps {
  snapshots: UsMarketSnapshot[];
  view: "snapshot" | "full";
  latest: UsMarketSnapshot;
}

function premiumCellClass(v: string | number | null | undefined): string {
  const raw = typeof v === "string" ? parseFloat(v) : (v as number | null);
  if (raw === null || raw === undefined || isNaN(raw as number)) return "";
  if ((raw as number) < 30) return "cell-green";
  if ((raw as number) <= 45) return "";
  if ((raw as number) <= 65) return "cell-amber";
  return "cell-red";
}

export function UsVsExUsTabUS({ snapshots, view, latest }: UsVsExUsTabUSProps) {
  const displaySnapshots =
    view === "snapshot" ? snapshots.filter((s) => SNAPSHOT_YEARS_US.includes(s.year)) : snapshots;

  const years = displaySnapshots.map((s) => s.year);

  const rows: TableRow[] = [
    {
      label: "US vs Ex-US Premium %",
      values: displaySnapshots.map((s) =>
        s.usVsExUsPremium !== null
          ? (s.usVsExUsPremium >= 0 ? "+" : "") + s.usVsExUsPremium.toFixed(1) + "%"
          : null
      ),
      mono: true,
      getCellClass: premiumCellClass,
    },
    {
      label: "Signal",
      values: displaySnapshots.map((s) => s.usVsExUsSignal ?? null),
      mono: false,
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <InfoCard title={metricExplanationsUS.usVsExUs.title} content={metricExplanationsUS.usVsExUs} />
      <DataTable years={years} rows={rows} highlightYears={[]} />

      <div className="flex flex-wrap gap-3 text-xs text-text-muted px-1">
        <span className="cell-green px-2 py-0.5 rounded">Below 30% — Attractive</span>
        <span className="px-2 py-0.5 rounded" style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
          30–45% — Fair
        </span>
        <span className="cell-amber px-2 py-0.5 rounded">45–65% — Caution</span>
        <span className="cell-red px-2 py-0.5 rounded">Above 65% — Stretched</span>
      </div>
      <p className="text-xs text-text-muted px-1">
        Only available from the 2000s onward (SPY/ACWX ETF launch dates).
      </p>
    </div>
  );
}
