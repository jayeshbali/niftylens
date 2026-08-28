// US market (S&P 500) constants — mirrors lib/constants.ts.
//
// Medians below are commonly-cited long-run figures (Shiller dataset,
// 1871–present, via multpl.com). Unlike India's, these ARE derivable from
// raw daily data (Shiller/multpl publish the full series), so once
// scripts/seed-historical-us.ts has run, consider recomputing them as the
// actual median/percentile of the ingested series rather than relying on
// commonly-cited approximations.

// Key market-cycle markers across the full 1871–present series (analogous to
// India's 5-year snapshot, but picked for regime significance rather than
// fixed intervals — the US series is long enough that every-5-years would be
// unwieldy).
export const SNAPSHOT_YEARS_US = ["1929", "1966", "2000", "2009", "2020", "2025"];

export const SP500_PE_MEDIAN = 15.8;   // trailing PE, 1871–present
export const CAPE_MEDIAN = 16.0;       // Shiller CAPE, 1871–present
export const SP500_PB_MEDIAN = 2.7;    // PB series only available from ~1978
export const SP500_DY_MEDIAN = 4.0;    // dividend yield, 1871–present (pre-1990s payout regime skews this high vs. recent decades)

// Forward PE, foreign/fund flows, and AAII/margin-debt/concentration were
// dropped — none have a free live data source (they were manual-entry-only).
// Only metrics with a genuinely automated feed remain.
export const ALL_TABS_US = [
  { id: "overview", label: "Overview" },
  { id: "pe", label: "PE Ratio" },
  { id: "pb", label: "PB Ratio" },
  { id: "dy", label: "Dividend Yield" },
  { id: "eps", label: "EPS Growth" },
  { id: "usVsExUs", label: "US vs Ex-US" },
  { id: "erp", label: "ERP" },
  { id: "mcapGdp", label: "Mcap/GDP" },
  { id: "riskSentiment", label: "Risk & Sentiment" },
  { id: "composite", label: "Composite Score" },
] as const;

export type TabIdUS = (typeof ALL_TABS_US)[number]["id"];

export const GROUPS_US = [
  { id: "overview", label: "Overview", tabs: ["overview"] },
  { id: "valuation", label: "Valuation", tabs: ["pe", "pb", "dy"] },
  { id: "earnings", label: "Earnings", tabs: ["eps", "erp"] },
  { id: "exUs", label: "Ex-US", tabs: ["usVsExUs"] },
  { id: "macro", label: "Macro", tabs: ["mcapGdp", "riskSentiment"] },
  { id: "composite", label: "Composite", tabs: ["composite"] },
];

// Same signal vocabulary as lib/constants.ts (SignalBadge is shared/generic).
