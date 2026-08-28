/**
 * Migration: create the three US-market tables.
 *
 * Run: bun scripts/migrate-add-us-tables.ts
 */

import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function run() {
  console.log("Creating US market tables...");

  await client.execute(`
    CREATE TABLE IF NOT EXISTS us_market_annual_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year TEXT NOT NULL UNIQUE,
      sp500_level REAL,
      sp500_pe_trailing REAL,
      sp500_pe_median REAL,
      pe_premium_discount REAL,
      sp500_pb REAL,
      pb_median REAL,
      pb_zone TEXT,
      dividend_yield REAL,
      dy_median REAL,
      dy_signal TEXT,
      sp500_eps REAL,
      eps_growth_yoy REAL,
      eps_3y_cagr REAL,
      forward_pe REAL,
      forward_pe_zone TEXT,
      implied_eps_growth REAL,
      cape_ratio REAL,
      cape_median REAL,
      us_vs_exus_premium REAL,
      us_vs_exus_signal TEXT,
      bond_yield_10y REAL,
      trailing_earnings_yield REAL,
      forward_earnings_yield REAL,
      trailing_erp REAL,
      forward_erp REAL,
      erp_signal TEXT,
      foreign_net_flow REAL,
      fund_net_flow REAL,
      fund_flow_growth_yoy REAL,
      mcap_gdp REAL,
      mcap_gdp_zone TEXT,
      composite_score REAL,
      composite_zone TEXT,
      sp500_1y_forward_return REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("✓ us_market_annual_snapshots");

  await client.execute(`
    CREATE TABLE IF NOT EXISTS us_market_daily_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      sp500_level REAL,
      sp500_pe_trailing REAL,
      sp500_pb REAL,
      dividend_yield REAL,
      sp500_eps REAL,
      cape_ratio REAL,
      bond_yield_10y REAL,
      trailing_earnings_yield REAL,
      trailing_erp REAL,
      us_vs_exus_premium REAL,
      vix REAL,
      hy_spread REAL,
      yield_curve_10y2y REAL,
      real_yield_10y REAL,
      data_source TEXT,
      fetched_at TEXT
    )
  `);
  console.log("✓ us_market_daily_snapshots");

  await client.execute(`
    CREATE TABLE IF NOT EXISTS us_market_monthly_flows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year_month TEXT NOT NULL UNIQUE,
      foreign_net_monthly REAL,
      fund_net_monthly REAL,
      aaii_bullish_pct REAL,
      aaii_bearish_pct REAL,
      aaii_neutral_pct REAL,
      margin_debt_balance REAL,
      top10_concentration_pct REAL,
      data_source TEXT,
      fetched_at TEXT
    )
  `);
  console.log("✓ us_market_monthly_flows");

  console.log("\nMigration complete.");
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
