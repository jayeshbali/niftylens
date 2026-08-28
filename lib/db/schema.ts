import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";

// Annual March-end snapshot — one row per year (historical + live)
export const marketAnnualSnapshots = sqliteTable("market_annual_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),

  // Period label e.g. "Mar-00", "Mar-26"
  year: text("year").notNull().unique(),

  // --- Nifty 50 ---
  niftyLevel: real("nifty_level"),
  niftyPePublished: real("nifty_pe_published"),
  niftyPeStandalone: real("nifty_pe_standalone"),
  niftyPeMedian: real("nifty_pe_median"),
  pePremiumDiscount: real("pe_premium_discount"),

  // --- Midcap 100 ---
  midcapPePublished: real("midcap_pe_published"),
  midcapPeStandalone: real("midcap_pe_standalone"),
  midcapPeMedian: real("midcap_pe_median"),
  midcapPremiumDiscount: real("midcap_premium_discount"),

  // --- Smallcap 100 ---
  smallcapPePublished: real("smallcap_pe_published"),
  smallcapPeStandalone: real("smallcap_pe_standalone"),
  smallcapPeMedian: real("smallcap_pe_median"),
  smallcapPremiumDiscount: real("smallcap_premium_discount"),

  // --- PB ---
  niftyPb: real("nifty_pb"),
  pbMedian: real("pb_median"),
  pbZone: text("pb_zone"),

  // --- Dividend Yield ---
  dividendYield: real("dividend_yield"),
  dyMedian: real("dy_median"),
  dySignal: text("dy_signal"),

  // --- EPS ---
  niftyEps: real("nifty_eps"),
  epsGrowthYoy: real("eps_growth_yoy"),
  eps3yCagr: real("eps_3y_cagr"),

  // --- Forward PE ---
  forwardPe: real("forward_pe"),
  forwardPeZone: text("forward_pe_zone"),
  impliedEpsGrowth: real("implied_eps_growth"),

  // --- MSCI ---
  msciIndiaPe: real("msci_india_pe"),
  msciEmPe: real("msci_em_pe"),
  indiaVsEmPremium: real("india_vs_em_premium"),
  indiaVsEmSignal: text("india_vs_em_signal"),

  // --- ERP ---
  bondYield10y: real("bond_yield_10y"),
  trailingEarningsYield: real("trailing_earnings_yield"),
  forwardEarningsYield: real("forward_earnings_yield"),
  trailingErp: real("trailing_erp"),
  forwardErp: real("forward_erp"),
  erpSignal: text("erp_signal"),

  // --- Flows ---
  fiiNet: real("fii_net"),
  diiNet: real("dii_net"),
  sipMonthlyAvg: real("sip_monthly_avg"),

  // --- Mcap/GDP ---
  mcapGdp: real("mcap_gdp"),
  mcapGdpZone: text("mcap_gdp_zone"),

  // --- Composite ---
  compositeScore: real("composite_score"),
  compositeZone: text("composite_zone"),

  // --- 1Y Forward Return (filled in 12 months later) ---
  nifty1yForwardReturn: real("nifty_1y_forward_return"),

  // Metadata
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

// Daily snapshots — for live data fetched via cron
export const marketDailySnapshots = sqliteTable("market_daily_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull().unique(), // ISO date "2026-04-02"

  niftyLevel: real("nifty_level"),
  niftyPePublished: real("nifty_pe_published"),
  niftyPeStandalone: real("nifty_pe_standalone"),
  niftyPb: real("nifty_pb"),
  dividendYield: real("dividend_yield"),
  niftyEps: real("nifty_eps"),

  midcapPePublished: real("midcap_pe_published"),
  midcapPeStandalone: real("midcap_pe_standalone"),

  smallcapPePublished: real("smallcap_pe_published"),
  smallcapPeStandalone: real("smallcap_pe_standalone"),

  bondYield10y: real("bond_yield_10y"),
  trailingEarningsYield: real("trailing_earnings_yield"),
  trailingErp: real("trailing_erp"),

  msciIndiaPe: real("msci_india_pe"),
  msciEmPe: real("msci_em_pe"),
  indiaVsEmPremium: real("india_vs_em_premium"),

  // Institutional flows — fetched daily from NSE
  fiiNetDaily: real("fii_net_daily"),   // ₹ crore, net = buy − sell
  diiNetDaily: real("dii_net_daily"),   // ₹ crore

  // Source metadata
  dataSource: text("data_source"),
  fetchedAt: text("fetched_at"),
});

// Monthly flow aggregates — updated ~10–15 days after month end
export const marketMonthlyFlows = sqliteTable("market_monthly_flows", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  yearMonth: text("year_month").notNull().unique(), // "2026-03"

  fiiNetMonthly: real("fii_net_monthly"),     // ₹ crore, sum of daily FII nets
  diiNetMonthly: real("dii_net_monthly"),     // ₹ crore, sum of daily DII nets
  sipMonthlyInflow: real("sip_monthly_inflow"), // ₹ crore, AMFI reported

  tradingDays: integer("trading_days"),        // days with FII/DII data available

  dataSource: text("data_source"),
  fetchedAt: text("fetched_at"),
});

export type MarketAnnualSnapshot = typeof marketAnnualSnapshots.$inferSelect;
export type NewMarketAnnualSnapshot = typeof marketAnnualSnapshots.$inferInsert;
export type MarketDailySnapshot = typeof marketDailySnapshots.$inferSelect;
export type NewMarketDailySnapshot = typeof marketDailySnapshots.$inferInsert;
export type MarketMonthlyFlow = typeof marketMonthlyFlows.$inferSelect;
export type NewMarketMonthlyFlow = typeof marketMonthlyFlows.$inferInsert;

// ═══════════════════════════════════════════════════════════════════════════
// US market (S&P 500) — mirrors the India tables above, field-for-field
// equivalent where a direct analogue exists. See lib/composite-score-us.ts
// and lib/data-sources/us/* for how these are populated.
// ═══════════════════════════════════════════════════════════════════════════

// Annual snapshot — one row per calendar year (US reporting convention;
// unlike India's March fiscal-year end). Historical seed goes back to 1871
// (Shiller dataset horizon) via multpl.com + FRED.
export const usMarketAnnualSnapshots = sqliteTable("us_market_annual_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),

  year: text("year").notNull().unique(), // "1871".."2026"

  // --- S&P 500 ---
  sp500Level: real("sp500_level"),
  sp500PeTrailing: real("sp500_pe_trailing"),
  sp500PeMedian: real("sp500_pe_median"),
  pePremiumDiscount: real("pe_premium_discount"),

  // --- PB ---
  sp500Pb: real("sp500_pb"),
  pbMedian: real("pb_median"),
  pbZone: text("pb_zone"),

  // --- Dividend Yield ---
  dividendYield: real("dividend_yield"),
  dyMedian: real("dy_median"),
  dySignal: text("dy_signal"),

  // --- EPS ---
  sp500Eps: real("sp500_eps"),
  epsGrowthYoy: real("eps_growth_yoy"),
  eps3yCagr: real("eps_3y_cagr"),

  // --- Forward PE ---
  forwardPe: real("forward_pe"),
  forwardPeZone: text("forward_pe_zone"),
  impliedEpsGrowth: real("implied_eps_growth"),

  // --- Shiller CAPE (bonus metric, informational) ---
  capeRatio: real("cape_ratio"),
  capeMedian: real("cape_median"),

  // --- US vs ex-US premium (SPY vs ACWX/VEU ETF PE proxy) ---
  usVsExUsPremium: real("us_vs_exus_premium"),
  usVsExUsSignal: text("us_vs_exus_signal"),

  // --- ERP ---
  bondYield10y: real("bond_yield_10y"),
  trailingEarningsYield: real("trailing_earnings_yield"),
  forwardEarningsYield: real("forward_earnings_yield"),
  trailingErp: real("trailing_erp"),
  forwardErp: real("forward_erp"),
  erpSignal: text("erp_signal"),

  // --- Flows (Treasury TIC foreign flows + ICI long-term fund flows) ---
  foreignNetFlow: real("foreign_net_flow"),   // $ billion, annual
  fundNetFlow: real("fund_net_flow"),         // $ billion, annual
  fundFlowGrowthYoy: real("fund_flow_growth_yoy"),

  // --- Mcap/GDP (Buffett Indicator: Wilshire 5000 / GDP) ---
  mcapGdp: real("mcap_gdp"),
  mcapGdpZone: text("mcap_gdp_zone"),

  // --- Composite ---
  compositeScore: real("composite_score"),
  compositeZone: text("composite_zone"),

  // --- 1Y Forward Return ---
  sp5001yForwardReturn: real("sp500_1y_forward_return"),

  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

// Daily snapshots — live data fetched via cron. Includes bonus risk/sentiment
// fields (VIX, credit spread, yield curve, real yield) since they're all
// daily-frequency and cheap to carry as extra columns rather than a new table.
export const usMarketDailySnapshots = sqliteTable("us_market_daily_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull().unique(), // ISO date "2026-04-02"

  sp500Level: real("sp500_level"),
  sp500PeTrailing: real("sp500_pe_trailing"),
  sp500Pb: real("sp500_pb"),
  dividendYield: real("dividend_yield"),
  sp500Eps: real("sp500_eps"),
  capeRatio: real("cape_ratio"),

  bondYield10y: real("bond_yield_10y"),
  trailingEarningsYield: real("trailing_earnings_yield"),
  trailingErp: real("trailing_erp"),

  usVsExUsPremium: real("us_vs_exus_premium"),

  // Bonus risk/sentiment (daily-frequency, free via FRED/Yahoo)
  vix: real("vix"),
  hySpread: real("hy_spread"),               // ICE BofA high-yield OAS, FRED BAMLH0A0HYM2
  yieldCurve10y2y: real("yield_curve_10y2y"), // FRED T10Y2Y
  realYield10y: real("real_yield_10y"),       // FRED DFII10 (10Y TIPS)

  dataSource: text("data_source"),
  fetchedAt: text("fetched_at"),
});

// Monthly flow + slow-cadence sentiment aggregates (manual entry — no free
// programmatic API for TIC/ICI/AAII/FINRA margin debt/index concentration).
export const usMarketMonthlyFlows = sqliteTable("us_market_monthly_flows", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  yearMonth: text("year_month").notNull().unique(), // "2026-03"

  foreignNetMonthly: real("foreign_net_monthly"), // $ billion, Treasury TIC
  fundNetMonthly: real("fund_net_monthly"),       // $ billion, ICI long-term fund flows

  // Bonus sentiment/leverage metrics (monthly/weekly cadence, manual entry)
  aaiiBullishPct: real("aaii_bullish_pct"),
  aaiiBearishPct: real("aaii_bearish_pct"),
  aaiiNeutralPct: real("aaii_neutral_pct"),
  marginDebtBalance: real("margin_debt_balance"), // $ billion, FINRA
  top10ConcentrationPct: real("top10_concentration_pct"), // S&P 500 top-10 weight

  dataSource: text("data_source"),
  fetchedAt: text("fetched_at"),
});

export type UsMarketAnnualSnapshot = typeof usMarketAnnualSnapshots.$inferSelect;
export type NewUsMarketAnnualSnapshot = typeof usMarketAnnualSnapshots.$inferInsert;
export type UsMarketDailySnapshot = typeof usMarketDailySnapshots.$inferSelect;
export type NewUsMarketDailySnapshot = typeof usMarketDailySnapshots.$inferInsert;
export type UsMarketMonthlyFlow = typeof usMarketMonthlyFlows.$inferSelect;
export type NewUsMarketMonthlyFlow = typeof usMarketMonthlyFlows.$inferInsert;
