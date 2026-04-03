"use client";

import type { MarketSnapshot } from "@/types";
import { DataTable, type TableRow } from "@/components/DataTable";
import { InfoCard } from "@/components/InfoCard";
import { metricExplanations } from "@/lib/content/metric-explanations";
import { SNAPSHOT_YEARS } from "@/lib/constants";

interface CompositeTabProps {
  snapshots: MarketSnapshot[];
  view: "snapshot" | "full";
  latest: MarketSnapshot;
}

function computePearsonR(xs: number[], ys: number[]): number | null {
  if (xs.length < 3 || xs.length !== ys.length) return null;
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0,
    denX = 0,
    denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  if (denX === 0 || denY === 0) return null;
  return num / Math.sqrt(denX * denY);
}

function scoreCellClass(v: string | number | null | undefined): string {
  const n = typeof v === "string" ? parseFloat(v) : (v as number | null);
  if (n === null || n === undefined || isNaN(n as number)) return "";
  if ((n as number) >= 7) return "cell-green";
  if ((n as number) >= 4) return "";       // 4–7 = Neutral (no tint)
  if ((n as number) >= 2.5) return "cell-amber";
  return "cell-red";
}

function returnCellClass(v: string | number | null | undefined): string {
  const raw = typeof v === "string" ? parseFloat(v) : (v as number | null);
  if (raw === null || raw === undefined || isNaN(raw as number)) return "";
  if ((raw as number) > 30) return "cell-green";
  if ((raw as number) >= 0) return "";
  return "cell-red";
}

export function CompositeTab({ snapshots, view, latest }: CompositeTabProps) {
  const displaySnapshots =
    view === "snapshot"
      ? snapshots.filter((s) => SNAPSHOT_YEARS.includes(s.year))
      : snapshots;

  const years = displaySnapshots.map((s) => s.year);

  // Compute R² from snapshots where both values exist
  const validPairs = snapshots.filter(
    (s) =>
      s.compositeScore !== null &&
      s.compositeScore !== undefined &&
      s.nifty1yForwardReturn !== null &&
      s.nifty1yForwardReturn !== undefined
  );
  const xs = validPairs.map((s) => s.compositeScore as number);
  const ys = validPairs.map((s) => s.nifty1yForwardReturn as number);
  const r = computePearsonR(xs, ys);
  const rSquared = r !== null ? r * r : null;

  const rows: TableRow[] = [
    {
      label: "Composite Score",
      values: displaySnapshots.map((s) =>
        s.compositeScore !== null && s.compositeScore !== undefined
          ? s.compositeScore.toFixed(1)
          : null
      ),
      mono: true,
      getCellClass: scoreCellClass,
    },
    {
      label: "Zone",
      values: displaySnapshots.map((s) => s.compositeZone ?? null),
      mono: false,
    },
    {
      label: "1Y Forward Return",
      values: displaySnapshots.map((s) => {
        if (s.nifty1yForwardReturn === null || s.nifty1yForwardReturn === undefined)
          return null;
        return (
          (s.nifty1yForwardReturn >= 0 ? "+" : "") +
          s.nifty1yForwardReturn.toFixed(1) +
          "%"
        );
      }),
      mono: true,
      getCellClass: returnCellClass,
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <InfoCard title={metricExplanations.composite.title} content={metricExplanations.composite} />

      {/* R² Stats Box */}
      <div
        className="rounded-xl p-5 border"
        style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
      >
        <h3
          className="text-xs font-bold uppercase tracking-widest mb-4"
          style={{ color: "var(--text-muted)" }}
        >
          In-Sample Validation Statistics
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-text-muted mb-1">Pearson r</div>
            <div className="mono text-xl font-semibold text-cyan">
              {r !== null ? r.toFixed(3) : "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-text-muted mb-1">R²</div>
            <div className="mono text-xl font-semibold text-cyan">
              {rSquared !== null ? rSquared.toFixed(3) : "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-text-muted mb-1">n observations</div>
            <div className="mono text-xl font-semibold text-text-primary">
              {validPairs.length}
            </div>
          </div>
          <div>
            <div className="text-xs text-text-muted mb-1">Current Score</div>
            <div className="mono text-xl font-semibold text-text-primary">
              {latest.compositeScore !== null && latest.compositeScore !== undefined
                ? latest.compositeScore.toFixed(1) + "/10"
                : "—"}
            </div>
          </div>
        </div>
        <p className="mt-4 text-xs text-amber-accent/80 border-t pt-3" style={{ borderColor: "var(--border)" }}>
          In-sample correlation, not an out-of-sample backtest. Scores and returns
          come from the same dataset — treat as indicative pattern, not a predictive model.
        </p>
      </div>

      <DataTable years={years} rows={rows} />

      {/* Zone legend */}
      <div className="flex flex-wrap gap-3 text-xs text-text-muted px-1">
        <span className="cell-green px-2 py-0.5 rounded">7.0+ — Attractive</span>
        <span className="px-2 py-0.5 rounded" style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
          4.0–6.9 — Neutral
        </span>
        <span className="cell-amber px-2 py-0.5 rounded">2.5–3.9 — Caution</span>
        <span className="cell-red px-2 py-0.5 rounded">Below 2.5 — Danger</span>
      </div>
    </div>
  );
}
