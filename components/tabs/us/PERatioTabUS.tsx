"use client";

import type { UsMarketSnapshot } from "@/types";
import { DataTable, type TableRow } from "@/components/DataTable";
import { InfoCard } from "@/components/InfoCard";
import { metricExplanationsUS } from "@/lib/content/metric-explanations-us";
import { SNAPSHOT_YEARS_US, SP500_PE_MEDIAN, CAPE_MEDIAN } from "@/lib/constants-us";

interface PERatioTabUSProps {
  snapshots: UsMarketSnapshot[];
  view: "snapshot" | "full";
  latest: UsMarketSnapshot;
}

function peCellClass(v: string | number | null | undefined): string {
  const n = typeof v === "string" ? parseFloat(v) : (v as number | null);
  if (n === null || n === undefined || isNaN(n as number)) return "";
  if ((n as number) < 17) return "cell-green";
  if ((n as number) <= 22) return "";
  return "cell-red";
}

function premiumCellClass(v: string | number | null | undefined): string {
  const raw = typeof v === "string" ? parseFloat(v) : (v as number | null);
  if (raw === null || raw === undefined || isNaN(raw as number)) return "";
  if ((raw as number) < -10) return "cell-green";
  if ((raw as number) > 30) return "cell-red";
  if ((raw as number) > 10) return "cell-amber";
  return "";
}

export function PERatioTabUS({ snapshots, view, latest }: PERatioTabUSProps) {
  const displaySnapshots =
    view === "snapshot" ? snapshots.filter((s) => SNAPSHOT_YEARS_US.includes(s.year)) : snapshots;

  const years = displaySnapshots.map((s) => s.year);

  const rows: TableRow[] = [
    {
      label: "PE (Trailing)",
      values: displaySnapshots.map((s) => (s.sp500PeTrailing !== null ? s.sp500PeTrailing.toFixed(1) : null)),
      mono: true,
      getCellClass: peCellClass,
    },
    {
      label: `Long-run Median (${SP500_PE_MEDIAN}x)`,
      values: displaySnapshots.map(() => SP500_PE_MEDIAN.toFixed(1)),
      mono: true,
    },
    {
      label: "Premium/Discount vs Median %",
      values: displaySnapshots.map((s) =>
        s.pePremiumDiscount !== null
          ? (s.pePremiumDiscount >= 0 ? "+" : "") + s.pePremiumDiscount.toFixed(1) + "%"
          : null
      ),
      mono: true,
      getCellClass: premiumCellClass,
    },
    {
      label: "Shiller CAPE",
      values: displaySnapshots.map((s) => (s.capeRatio !== null ? s.capeRatio.toFixed(1) : null)),
      mono: true,
    },
    {
      label: `CAPE Long-run Median (${CAPE_MEDIAN}x)`,
      values: displaySnapshots.map(() => CAPE_MEDIAN.toFixed(1)),
      mono: true,
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <InfoCard title={metricExplanationsUS.pe.title} content={metricExplanationsUS.pe} />

      <DataTable years={years} rows={rows} highlightYears={[]} sectionTitle="S&P 500" />

      <p className="text-xs text-text-muted px-1">
        Unlike India, there is no methodology break in this series — it is one continuous
        history back to 1871. Long-run medians reflect the full series and are far stricter
        than the modern (post-1990s) valuation regime — treat premium/discount as directional
        context, not a strict buy/sell signal.
      </p>
    </div>
  );
}
