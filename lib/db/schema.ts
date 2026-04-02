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
