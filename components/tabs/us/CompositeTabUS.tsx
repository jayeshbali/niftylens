"use client";

import type { UsMarketSnapshot } from "@/types";
import { DataTable, type TableRow } from "@/components/DataTable";
import { InfoCard } from "@/components/InfoCard";
import { metricExplanationsUS } from "@/lib/content/metric-explanations-us";
import { SNAPSHOT_YEARS_US } from "@/lib/constants-us";

interface CompositeTabUSProps {
  snapshots: UsMarketSnapshot[];
  view: "snapshot" | "full";
  latest: UsMarketSnapshot;
}

function computePearsonR(xs: number[], ys: number[]): number | null {
  if (xs.length < 3 || xs.length !== ys.length) return null;
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, denX = 0, denY = 0;
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
  if ((n as number) >= 4) return "";
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

export function CompositeTabUS({ snapshots, view, latest }: CompositeTabUSProps) {
  const displaySnapshots =
    view === "snapshot" ? snapshots.filter((s) => SNAPSHOT_YEARS_US.includes(s.year)) : snapshots;

  const years = displaySnapshots.map((s) => s.year);

  const validPairs = snapshots.filter(
    (s) => s.compositeScore !== null && s.sp5001yForwardReturn !== null
  );
  const xs = validPairs.map((s) => s.compositeScore as number);
  const ys = validPairs.map((s) => s.sp5001yForwardReturn as number);
  const r = computePearsonR(xs, ys);
  const rSquared = r !== null ? r * r : null;

  const rows: TableRow[] = [
    {
      label: "Composite Score",
      values: displaySnapshots.map((s) => (s.compositeScore !== null ? s.compositeScore.toFixed(1) : null)),
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
      values: displaySnapshots.map((s) =>
        s.sp5001yForwardReturn !== null
          ? (s.sp5001yForwardReturn >= 0 ? "+" : "") + s.sp5001yForwardReturn.toFixed(1) + "%"
          : null
      ),
      mono: true,
      getCellClass: returnCellClass,
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <InfoCard title={metricExplanationsUS.composite.title} content={metricExplanationsUS.composite} />

      <div
        className="rounded-xl p-5 border"
        style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
      >
        <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
          In-Sample Validation Statistics
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-text-muted mb-1">Pearson r</div>
            <div className="mono text-xl font-semibold text-cyan">{r !== null ? r.toFixed(3) : "—"}</div>
          </div>
          <div>
            <div className="text-xs text-text-muted mb-1">R²</div>
            <div className="mono text-xl font-semibold text-cyan">
              {rSquared !== null ? rSquared.toFixed(3) : "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-text-muted mb-1">n observations</div>
            <div className="mono text-xl font-semibold text-text-primary">{validPairs.length}</div>
          </div>
          <div>
            <div className="text-xs text-text-muted mb-1">Current Score</div>
            <div className="mono text-xl font-semibold text-text-primary">
              {latest.compositeScore !== null ? latest.compositeScore.toFixed(1) + "/10" : "—"}
            </div>
          </div>
        </div>
        <p className="mt-4 text-xs text-amber-accent/80 border-t pt-3" style={{ borderColor: "var(--border)" }}>
          In-sample correlation, not an out-of-sample backtest. 1Y forward returns are only
          backfilled once seeded — n may be 0 immediately after the historical seed runs.
        </p>
      </div>

      <DataTable years={years} rows={rows} highlightYears={[]} />

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
