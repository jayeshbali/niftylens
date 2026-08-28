/**
 * Migration: create the two international-market tables (shared across
 * China, Japan, Germany, UK, France — discriminated by a `market` column).
 *
 * Run: bun scripts/migrate-add-intl-tables.ts
 */

import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function run() {
  console.log("Creating international-market tables...");

  await client.execute(`
    CREATE TABLE IF NOT EXISTS intl_market_daily_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      market TEXT NOT NULL,
      date TEXT NOT NULL,
      index_level REAL,
      data_source TEXT,
      fetched_at TEXT
    )
  `);
  await client.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS intl_daily_market_date_idx
    ON intl_market_daily_snapshots (market, date)
  `);
  console.log("✓ intl_market_daily_snapshots");

  await client.execute(`
    CREATE TABLE IF NOT EXISTS intl_market_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      market TEXT NOT NULL,
      period TEXT NOT NULL,
      index_level REAL,
      pe_trailing REAL,
      dividend_yield REAL,
      cape_ratio REAL,
      bond_yield_10y REAL,
      trailing_earnings_yield REAL,
      trailing_erp REAL,
      mcap_gdp REAL,
      composite_score REAL,
      composite_zone TEXT,
      data_source TEXT,
      fetched_at TEXT
    )
  `);
  await client.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS intl_snapshots_market_period_idx
    ON intl_market_snapshots (market, period)
  `);
  console.log("✓ intl_market_snapshots");

  console.log("\nMigration complete.");
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
