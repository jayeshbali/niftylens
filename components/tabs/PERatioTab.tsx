"use client";

import type { MarketSnapshot } from "@/types";
import { DataTable, type TableRow } from "@/components/DataTable";
import { InfoCard } from "@/components/InfoCard";
import { metricExplanations } from "@/lib/content/metric-explanations";
import { SNAPSHOT_YEARS, POST_2021_YEARS, PE_MEDIAN, MIDCAP_PE_MEDIAN, SMALLCAP_PE_MEDIAN } from "@/lib/constants";

interface PERatioTabProps {
  snapshots: MarketSnapshot[];
  view: "snapshot" | "full";
  latest: MarketSnapshot;
}

function peCellClass(v: string | number | null | undefined): string {
  const n = typeof v === "string" ? parseFloat(v) : (v as number | null);
  if (n === null || n === undefined || isNaN(n as number)) return "";
  if ((n as number) < 17) return "cell-green";
  if ((n as number) <= 22) return "";
  if ((n as number) <= 24) return "cell-amber";
  return "cell-red";
}

function premiumCellClass(v: string | number | null | undefined): string {
  const raw = typeof v === "string" ? parseFloat(v) : (v as number | null);
  if (raw === null || raw === undefined || isNaN(raw as number)) return "";
  if ((raw as number) < -10) return "cell-green";
  if ((raw as number) > 10) return "cell-amber";
  if ((raw as number) > 20) return "cell-red";
  return "";
}

export function PERatioTab({ snapshots, view, latest }: PERatioTabProps) {
  const displaySnapshots =
    view === "snapshot"
      ? snapshots.filter((s) => SNAPSHOT_YEARS.includes(s.year))
      : snapshots;

  const years = displaySnapshots.map((s) => s.year);

  // Nifty 50 rows
  const nifty50Rows: TableRow[] = [
    {
      label: "Published PE",
      values: displaySnapshots.map((s) =>
        s.niftyPePublished !== null && s.niftyPePublished !== undefined
          ? s.niftyPePublished.toFixed(1)
          : null
      ),
      mono: true,
    },
    {
      label: `Standalone Equiv (▲ adj. post-Mar-21)`,
      values: displaySnapshots.map((s) => {
        if (s.niftyPeStandalone === null || s.niftyPeStandalone === undefined) return null;
        const isAdj = POST_2021_YEARS.includes(s.year);
        return isAdj
          ? `▲ ${s.niftyPeStandalone.toFixed(1)}`
          : s.niftyPeStandalone.toFixed(1);
      }),
      mono: true,
      getCellClass: (v, year) => {
        const raw = typeof v === "string" ? parseFloat(v.replace("▲ ", "")) : (v as number | null);
        const isAdj = POST_2021_YEARS.includes(year);
        const baseClass = peCellClass(raw);
        return isAdj ? `cell-adjusted ${baseClass}` : baseClass;
      },
    },
    {
      label: `Median (${PE_MEDIAN}x)`,
      values: displaySnapshots.map(() => PE_MEDIAN.toFixed(1)),
      mono: true,
    },
    {
      label: "Premium/Discount %",
      values: displaySnapshots.map((s) =>
        s.pePremiumDiscount !== null && s.pePremiumDiscount !== undefined
          ? (s.pePremiumDiscount >= 0 ? "+" : "") + s.pePremiumDiscount.toFixed(1) + "%"
          : null
      ),
      mono: true,
      getCellClass: premiumCellClass,
    },
  ];

  // Midcap 100 rows
  const midcapRows: TableRow[] = [
    {
      label: "Published PE",
      values: displaySnapshots.map((s) =>
        s.midcapPePublished !== null && s.midcapPePublished !== undefined
          ? s.midcapPePublished.toFixed(1)
          : null
      ),
      mono: true,
    },
    {
      label: `Standalone Equiv (▲ adj. post-Mar-21)`,
      values: displaySnapshots.map((s) => {
        if (s.midcapPeStandalone === null || s.midcapPeStandalone === undefined) return null;
        const isAdj = POST_2021_YEARS.includes(s.year);
        return isAdj
          ? `▲ ${s.midcapPeStandalone.toFixed(1)}`
          : s.midcapPeStandalone.toFixed(1);
      }),
      mono: true,
      getCellClass: (_, year) => (POST_2021_YEARS.includes(year) ? "cell-adjusted" : ""),
    },
    {
      label: `Median (${MIDCAP_PE_MEDIAN}x)`,
      values: displaySnapshots.map(() => MIDCAP_PE_MEDIAN.toFixed(1)),
      mono: true,
    },
    {
      label: "Premium/Discount %",
      values: displaySnapshots.map((s) =>
        s.midcapPremiumDiscount !== null && s.midcapPremiumDiscount !== undefined
          ? (s.midcapPremiumDiscount >= 0 ? "+" : "") +
            s.midcapPremiumDiscount.toFixed(1) +
            "%"
          : null
      ),
      mono: true,
      getCellClass: premiumCellClass,
    },
  ];

  // Smallcap 100 rows
  const smallcapRows: TableRow[] = [
    {
      label: "Published PE",
      values: displaySnapshots.map((s) =>
        s.smallcapPePublished !== null && s.smallcapPePublished !== undefined
          ? s.smallcapPePublished.toFixed(1)
          : null
      ),
      mono: true,
    },
    {
      label: `Standalone Equiv (▲ adj. post-Mar-21)`,
      values: displaySnapshots.map((s) => {
        if (s.smallcapPeStandalone === null || s.smallcapPeStandalone === undefined) return null;
        const isAdj = POST_2021_YEARS.includes(s.year);
        return isAdj
          ? `▲ ${s.smallcapPeStandalone.toFixed(1)}`
          : s.smallcapPeStandalone.toFixed(1);
      }),
      mono: true,
      getCellClass: (_, year) => (POST_2021_YEARS.includes(year) ? "cell-adjusted" : ""),
    },
    {
      label: `Median (${SMALLCAP_PE_MEDIAN}x)`,
      values: displaySnapshots.map(() => SMALLCAP_PE_MEDIAN.toFixed(1)),
      mono: true,
    },
    {
      label: "Premium/Discount %",
      values: displaySnapshots.map((s) =>
        s.smallcapPremiumDiscount !== null && s.smallcapPremiumDiscount !== undefined
          ? (s.smallcapPremiumDiscount >= 0 ? "+" : "") +
            s.smallcapPremiumDiscount.toFixed(1) +
            "%"
          : null
      ),
      mono: true,
      getCellClass: premiumCellClass,
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <InfoCard title={metricExplanations.pe.title} content={metricExplanations.pe} />

      <DataTable years={years} rows={nifty50Rows} sectionTitle="Nifty 50" />
      <DataTable years={years} rows={midcapRows} sectionTitle="Midcap 100" />
      <DataTable years={years} rows={smallcapRows} sectionTitle="Smallcap 100" />

      <p className="text-xs text-text-muted px-1">
        ▲ = Post-2021 standalone equivalent (×1.175 adjustment applied to published PE).
        Orange cells indicate adjusted values — comparable to pre-2021 series.
      </p>
    </div>
  );
}
