"use client";

import type { IntlMarketSnapshot } from "@/lib/db/schema";
import type { IntlMarketConfig } from "@/lib/constants-intl";
import { VerdictCard } from "@/components/VerdictCard";
import { DataTable, type TableRow } from "@/components/DataTable";

interface IntlMarketViewProps {
  config: IntlMarketConfig;
  snapshots: IntlMarketSnapshot[];
  latestIndexLevel: number | null;
}

function compositeSignal(score: number | null): string | null {
  if (score === null || score === undefined) return null;
  if (score >= 7) return "Attractive";
  if (score >= 4) return "Neutral";
  if (score >= 2.5) return "Caution";
  return "Danger";
}

function peSignal(v: number | null): string | null {
  if (v === null) return null;
  if (v < 15) return "Attractive";
  if (v <= 22) return "Neutral";
  return "Danger";
}

function dySignal(v: number | null): string | null {
  if (v === null) return null;
  if (v > 3.0) return "Attractive";
  if (v >= 1.5) return "Neutral";
  return "Caution";
}

export function IntlMarketView({ config, snapshots, latestIndexLevel }: IntlMarketViewProps) {
  const latest = snapshots.at(-1) ?? null;

  const rows: TableRow[] = [
    {
      label: `PE (Trailing)`,
      values: snapshots.map((s) => (s.peTrailing !== null ? s.peTrailing.toFixed(1) : null)),
      mono: true,
    },
    {
      label: "Dividend Yield %",
      values: snapshots.map((s) => (s.dividendYield !== null ? s.dividendYield.toFixed(2) + "%" : null)),
      mono: true,
    },
    {
      label: "CAPE",
      values: snapshots.map((s) => (s.capeRatio !== null ? s.capeRatio.toFixed(1) : null)),
      mono: true,
    },
    {
      label: "10Y Bond Yield %",
      values: snapshots.map((s) => (s.bondYield10y !== null ? s.bondYield10y.toFixed(2) + "%" : null)),
      mono: true,
    },
    {
      label: "Trailing ERP %",
      values: snapshots.map((s) =>
        s.trailingErp !== null ? (s.trailingErp >= 0 ? "+" : "") + s.trailingErp.toFixed(2) + "%" : null
      ),
      mono: true,
    },
    {
      label: "Mcap/GDP %",
      values: snapshots.map((s) => (s.mcapGdp !== null ? s.mcapGdp.toFixed(1) + "%" : null)),
      mono: true,
    },
    {
      label: "Composite Score",
      values: snapshots.map((s) => (s.compositeScore !== null ? s.compositeScore.toFixed(1) : null)),
      mono: true,
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <span>{config.flag}</span> {config.label} — {config.indexName}
        </h2>
        <p className="text-xs text-text-muted mt-1">
          Lean view — built entirely from free live data (Yahoo Finance, Siblis Research, FRED, World Bank).
          No P/B ratio and no deep history for this market — see the note below.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <VerdictCard
          label="Index Level"
          value={latestIndexLevel !== null ? `${config.currency}${Math.round(latestIndexLevel).toLocaleString()}` : "—"}
          signal={null}
          context={`${config.indexName}, live via Yahoo Finance.`}
        />
        <VerdictCard
          label="PE (Trailing)"
          value={latest?.peTrailing !== null && latest?.peTrailing !== undefined ? latest.peTrailing.toFixed(1) + "x" : "—"}
          signal={peSignal(latest?.peTrailing ?? null)}
          context={`As of ${latest?.period ?? "—"} (Siblis Research, semi-annual).`}
        />
        <VerdictCard
          label="Dividend Yield"
          value={
            latest?.dividendYield !== null && latest?.dividendYield !== undefined
              ? latest.dividendYield.toFixed(2) + "%"
              : "—"
          }
          signal={dySignal(latest?.dividendYield ?? null)}
          context="Trailing dividend yield, semi-annual."
        />
        <VerdictCard
          label="CAPE"
          value={latest?.capeRatio !== null && latest?.capeRatio !== undefined ? latest.capeRatio.toFixed(1) + "x" : "—"}
          signal={null}
          context="Shiller-style cyclically-adjusted PE."
        />
        <VerdictCard
          label="10Y Bond Yield"
          value={
            latest?.bondYield10y !== null && latest?.bondYield10y !== undefined
              ? latest.bondYield10y.toFixed(2) + "%"
              : "—"
          }
          signal={null}
          context={config.bondFredSeries ? "FRED (OECD long-term rate)." : "No free source for this market."}
        />
        <VerdictCard
          label="Trailing ERP"
          value={
            latest?.trailingErp !== null && latest?.trailingErp !== undefined
              ? (latest.trailingErp >= 0 ? "+" : "") + latest.trailingErp.toFixed(2) + "%"
              : "—"
          }
          signal={null}
          context="Earnings yield minus 10Y bond yield."
        />
        <VerdictCard
          label="Mcap/GDP"
          value={latest?.mcapGdp !== null && latest?.mcapGdp !== undefined ? latest.mcapGdp.toFixed(1) + "%" : "—"}
          signal={null}
          context="World Bank official ratio, annual."
        />
        <VerdictCard
          label="Composite Score"
          value={
            latest?.compositeScore !== null && latest?.compositeScore !== undefined
              ? latest.compositeScore.toFixed(1) + "/10"
              : "—"
          }
          subvalue={latest?.compositeZone ?? undefined}
          signal={compositeSignal(latest?.compositeScore ?? null)}
          context="4 signals: PE, dividend yield, ERP, Mcap/GDP."
        />
      </div>

      {snapshots.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wider">
            Available History ({snapshots.length} periods)
          </h3>
          <DataTable years={snapshots.map((s) => s.period)} rows={rows} highlightYears={[]} />
        </div>
      ) : (
        <p className="text-sm text-text-muted">No historical data yet — run the seed script.</p>
      )}

      <div
        className="rounded-lg p-4 text-xs"
        style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
      >
        <strong style={{ color: "var(--amber-accent)" }}>About this data:</strong> {config.label} uses a leaner,
        generic framework than India/US — only metrics with a genuine free live source are shown. No P/B ratio
        (no free country-level source found). History only goes back to Siblis Research&apos;s free-tier start
        (~2023, occasionally earlier), not decades. {config.bondFredSeries === null &&
          "10Y bond yield / ERP are unavailable for this market — not covered by FRED's OECD series. "}
        Composite score thresholds are illustrative, not calibrated per-market — there isn&apos;t enough history yet.
      </div>
    </div>
  );
}
