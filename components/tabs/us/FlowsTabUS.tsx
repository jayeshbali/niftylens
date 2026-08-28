"use client";

import type { UsMarketSnapshot } from "@/types";
import { DataTable, type TableRow } from "@/components/DataTable";
import { InfoCard } from "@/components/InfoCard";
import { metricExplanationsUS } from "@/lib/content/metric-explanations-us";
import { SNAPSHOT_YEARS_US } from "@/lib/constants-us";

interface FlowsTabUSProps {
  snapshots: UsMarketSnapshot[];
  view: "snapshot" | "full";
  latest: UsMarketSnapshot;
}

function formatFlow(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "+";
  return `${sign}$${abs.toFixed(1)}B`;
}

function flowCellClass(v: string | number | null | undefined): string {
  if (typeof v === "string") {
    if (v.startsWith("+")) return "cell-green";
    if (v.startsWith("-")) return "cell-red";
  }
  return "";
}

export function FlowsTabUS({ snapshots, view, latest }: FlowsTabUSProps) {
  const displaySnapshots =
    view === "snapshot" ? snapshots.filter((s) => SNAPSHOT_YEARS_US.includes(s.year)) : snapshots;

  const years = displaySnapshots.map((s) => s.year);

  const rows: TableRow[] = [
    {
      label: "Foreign Net ($B, annual)",
      values: displaySnapshots.map((s) => formatFlow(s.foreignNetFlow)),
      mono: true,
      getCellClass: flowCellClass,
    },
    {
      label: "Fund Net ($B, annual)",
      values: displaySnapshots.map((s) => formatFlow(s.fundNetFlow)),
      mono: true,
      getCellClass: flowCellClass,
    },
    {
      label: "Fund Flow Growth YoY %",
      values: displaySnapshots.map((s) =>
        s.fundFlowGrowthYoy !== null
          ? (s.fundFlowGrowthYoy >= 0 ? "+" : "") + s.fundFlowGrowthYoy.toFixed(1) + "%"
          : null
      ),
      mono: true,
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <InfoCard title={metricExplanationsUS.flows.title} content={metricExplanationsUS.flows} />
      <DataTable years={years} rows={rows} highlightYears={[]} />

      <p className="text-xs text-text-muted px-1">
        Foreign net = Treasury TIC net foreign purchases of US securities. Fund net = ICI
        long-term (equity + bond) fund flows. Both are annual net figures, entered manually —
        no free programmatic API exists for either. Positive = net inflow, negative = net outflow.
      </p>
    </div>
  );
}
