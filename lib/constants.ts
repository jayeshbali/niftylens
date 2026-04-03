export const SNAPSHOT_YEARS = ["Mar-05", "Mar-10", "Mar-15", "Mar-20", "Mar-25", "Mar-26"];

// NSE switched from standalone → consolidated earnings in April 2021.
// Consolidated earnings are ~15–20% higher, so we multiply by 1.175 (midpoint)
// to restore an apples-to-apples standalone-equivalent series.
export const PE_ADJUSTMENT_FACTOR = 1.175;
export const PE_CONSOLIDATION_DATE = new Date("2021-04-01"); // dates >= this need adjustment
export const POST_CONSOLIDATION_YEARS = ["Mar-22", "Mar-23", "Mar-24", "Mar-25", "Mar-26"]; // orange tint

export const PE_MEDIAN = 22.0;
export const PB_MEDIAN = 3.4;
export const DY_MEDIAN = 1.4;
export const MIDCAP_PE_MEDIAN = 26.5;
export const SMALLCAP_PE_MEDIAN = 24.5;

// Post-2021 adjusted PE columns (standalone equiv = published × 1.175)
export const POST_2021_YEARS = ["Mar-22", "Mar-23", "Mar-24", "Mar-25", "Mar-26"];

export const ALL_TABS = [
  { id: "overview", label: "Overview" },
  { id: "pe", label: "PE Ratio" },
  { id: "pb", label: "PB Ratio" },
  { id: "dy", label: "Dividend Yield" },
  { id: "eps", label: "EPS Growth" },
  { id: "forwardPe", label: "Forward PE" },
  { id: "indiaVsEm", label: "India vs EM" },
  { id: "erp", label: "ERP" },
  { id: "flows", label: "FII/DII & SIP" },
  { id: "mcapGdp", label: "Mcap/GDP" },
  { id: "composite", label: "Composite Score" },
] as const;

export type TabId = (typeof ALL_TABS)[number]["id"];

// Signal badge color categories
export const SIGNAL_GREEN = new Set([
  "Attractive",
  "Buy",
  "Strong Buy",
  "Undervalued",
  "Record High",
]);

export const SIGNAL_AMBER = new Set([
  "Caution",
  "Rich",
  "Expensive",
  "Above Avg",
  "Bonds Competitive",
  "Fair-Cheap",
]);

export const SIGNAL_RED = new Set(["Danger", "Stretched", "Outflow"]);

// Neutral signals get slate styling
export const SIGNAL_NEUTRAL = new Set([
  "Neutral",
  "Fair",
  "Normal",
  "Tight — Earnings Must Deliver",
]);
