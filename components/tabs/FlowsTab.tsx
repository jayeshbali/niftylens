"use client";

import type { MarketSnapshot } from "@/types";
import { DataTable, type TableRow } from "@/components/DataTable";
import { InfoCard } from "@/components/InfoCard";
import { metricExplanations } from "@/lib/content/metric-explanations";
import { SNAPSHOT_YEARS } from "@/lib/constants";

interface FlowsTabProps {
  snapshots: MarketSnapshot[];
  view: "snapshot" | "full";
  latest: MarketSnapshot;
}

function formatFlow(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "+";
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(1)}L Cr`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(0)}K Cr`;
  return `${sign}₹${abs.toFixed(0)} Cr`;
}

function formatSip(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K Cr`;
  return `₹${v.toFixed(0)} Cr`;
}

function flowCellClass(v: string | number | null | undefined): string {
  const raw = typeof v === "string" ? parseFloat(v.replace(/[₹+\-KLCr\s]/g, "").replace(",", "")) : (v as number | null);
  if (raw === null || raw === undefined || isNaN(raw as number)) return "";
  // Check sign from original string
  if (typeof v === "string") {
    if (v.startsWith("+")) return "cell-green";
    if (v.startsWith("-")) return "cell-red";
  }
  return "";
}

function sipCellClass(v: string | number | null | undefined): string {
  // Higher SIP = more structural support = better
  if (v === null || v === undefined || v === "—") return "";
  return "cell-green";
}

export function FlowsTab({ snapshots, view, latest }: FlowsTabProps) {
  const displaySnapshots =
    view === "snapshot"
      ? snapshots.filter((s) => SNAPSHOT_YEARS.includes(s.year))
      : snapshots;

  const years = displaySnapshots.map((s) => s.year);

  const rows: TableRow[] = [
    {
      label: "FII Net (₹ Cr)",
      values: displaySnapshots.map((s) => formatFlow(s.fiiNet)),
      mono: true,
      getCellClass: flowCellClass,
    },
    {
      label: "DII Net (₹ Cr)",
      values: displaySnapshots.map((s) => formatFlow(s.diiNet)),
      mono: true,
      getCellClass: flowCellClass,
    },
    {
      label: "SIP Monthly Avg (₹ Cr)",
      values: displaySnapshots.map((s) => formatSip(s.sipMonthlyAvg)),
      mono: true,
      getCellClass: sipCellClass,
    },
    {
      // Annualised SIP = monthly × 12 — shows the structural domestic demand floor per year
      label: "Market Floor / yr (₹ Cr)",
      values: displaySnapshots.map((s) =>
        s.sipMonthlyAvg !== null && s.sipMonthlyAvg !== undefined
          ? formatSip(s.sipMonthlyAvg * 12)
          : null
      ),
      mono: true,
      getCellClass: sipCellClass,
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <InfoCard title={metricExplanations.flows.title} content={metricExplanations.flows} />
      <DataTable years={years} rows={rows} />

      <p className="text-xs text-text-muted px-1">
        FII/DII flows are annual net figures. SIP is monthly average for that fiscal year.
        K = thousands of crore, L = lakhs of crore. Positive = net buying, negative = net selling.
      </p>
    </div>
  );
}
