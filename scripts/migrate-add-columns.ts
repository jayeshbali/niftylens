/**
 * Migration: add fii_net_daily, dii_net_daily to market_daily_snapshots
 *             add market_monthly_flows table
 *
 * Run: bun scripts/migrate-add-columns.ts
 */

import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function run() {
  console.log("Running migration...");

  // Add columns to market_daily_snapshots (SQLite supports ADD COLUMN directly)
  const alterStatements = [
    `ALTER TABLE market_daily_snapshots ADD COLUMN fii_net_daily REAL`,
    `ALTER TABLE market_daily_snapshots ADD COLUMN dii_net_daily REAL`,
  ];

  for (const stmt of alterStatements) {
    try {
      await client.execute(stmt);
      console.log(`✓ ${stmt}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("duplicate column")) {
        console.log(`⚠ column already exists, skipping: ${stmt}`);
      } else {
        throw err;
      }
    }
  }

  // Create market_monthly_flows table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS market_monthly_flows (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      year_month   TEXT    NOT NULL UNIQUE,
      fii_net_monthly   REAL,
      dii_net_monthly   REAL,
      sip_monthly_inflow REAL,
      trading_days INTEGER,
      data_source  TEXT,
      fetched_at   TEXT
    )
  `);
  console.log("✓ CREATE TABLE IF NOT EXISTS market_monthly_flows");

  console.log("\nMigration complete.");
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
