/**
 * One-time seed script: populates market_annual_snapshots from the CSV data.
 * Run with: bun scripts/seed-historical.ts
 */

import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { marketAnnualSnapshots } from "../lib/db/schema";
import { readFileSync } from "fs";
import { join } from "path";

// Load env manually (bun reads .env automatically but let's be explicit)
const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL!;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_DATABASE_URL) {
  throw new Error("TURSO_DATABASE_URL is not set");
}

const client = createClient({ url: TURSO_DATABASE_URL, authToken: TURSO_AUTH_TOKEN });
const db = drizzle(client);

function parseNum(val: string): number | null {
  const trimmed = val.trim();
  if (!trimmed) return null;
  const n = parseFloat(trimmed);
  return isNaN(n) ? null : n;
}

function parseStr(val: string): string | null {
  const trimmed = val.trim();
  return trimmed || null;
}

function parseCSV(content: string) {
  const lines = content.trim().split("\n");
  const headers = lines[0].split(",");

  return lines.slice(1).filter(l => l.trim()).map(line => {
    const rawValues = line.split(",");

    // Some early rows have an extra empty column from the source spreadsheet.
    // Detect and remove it before mapping to headers.
    let values = rawValues;
    if (rawValues.length === headers.length + 1) {
      // Two known cases:
      // - Extra empty at pos 14 (Mar-05): Smallcap area had blank filler column
      // - Extra empty at pos 30 (Mar-00 to Mar-03): MSCI/Bond yield gap
      const num = (s: string) => parseFloat(s);
      const inRange = (s: string, lo: number, hi: number) =>
        s.trim() !== "" && !isNaN(num(s)) && num(s) >= lo && num(s) <= hi;

      if (rawValues[14].trim() === "" && inRange(rawValues[15], 1, 8)) {
        // Extra empty at pos 14 — PB Ratio got bumped to pos 15
        values = [...rawValues.slice(0, 14), ...rawValues.slice(15)];
      } else if (rawValues[30].trim() === "" && inRange(rawValues[31], 3, 15)) {
        // Extra empty at pos 30 — Bond Yield got bumped to pos 31
        values = [...rawValues.slice(0, 30), ...rawValues.slice(31)];
      }
    }

    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h.trim()] = values[i] ?? "";
    });
    return row;
  });
}

async function seed() {
  const csvPath = join(import.meta.dir, "../market_valuation_data.csv");
  const csvContent = readFileSync(csvPath, "utf-8");
  const rows = parseCSV(csvContent);

  console.log(`Parsed ${rows.length} rows from CSV`);

  // Push schema first (create tables if they don't exist)
  await client.execute(`
    CREATE TABLE IF NOT EXISTS market_annual_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year TEXT NOT NULL UNIQUE,
      nifty_level REAL,
      nifty_pe_published REAL,
      nifty_pe_standalone REAL,
      nifty_pe_median REAL,
      pe_premium_discount REAL,
      midcap_pe_published REAL,
      midcap_pe_standalone REAL,
      midcap_pe_median REAL,
      midcap_premium_discount REAL,
      smallcap_pe_published REAL,
      smallcap_pe_standalone REAL,
      smallcap_pe_median REAL,
      smallcap_premium_discount REAL,
      nifty_pb REAL,
      pb_median REAL,
      pb_zone TEXT,
      dividend_yield REAL,
      dy_median REAL,
      dy_signal TEXT,
      nifty_eps REAL,
      eps_growth_yoy REAL,
      eps_3y_cagr REAL,
      forward_pe REAL,
      forward_pe_zone TEXT,
      implied_eps_growth REAL,
      msci_india_pe REAL,
      msci_em_pe REAL,
      india_vs_em_premium REAL,
      india_vs_em_signal TEXT,
      bond_yield_10y REAL,
      trailing_earnings_yield REAL,
      forward_earnings_yield REAL,
      trailing_erp REAL,
      forward_erp REAL,
      erp_signal TEXT,
      fii_net REAL,
      dii_net REAL,
      sip_monthly_avg REAL,
      mcap_gdp REAL,
      mcap_gdp_zone TEXT,
      composite_score REAL,
      composite_zone TEXT,
      nifty_1y_forward_return REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS market_daily_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      nifty_level REAL,
      nifty_pe_published REAL,
      nifty_pe_standalone REAL,
      nifty_pb REAL,
      dividend_yield REAL,
      nifty_eps REAL,
      midcap_pe_published REAL,
      midcap_pe_standalone REAL,
      smallcap_pe_published REAL,
      smallcap_pe_standalone REAL,
      bond_yield_10y REAL,
      trailing_earnings_yield REAL,
      trailing_erp REAL,
      msci_india_pe REAL,
      msci_em_pe REAL,
      india_vs_em_premium REAL,
      data_source TEXT,
      fetched_at TEXT
    )
  `);

  console.log("Tables created (or already exist).");

  const records = rows.map(row => ({
    year: row["Year"].trim(),
    niftyLevel: parseNum(row["Nifty 50 Level"]),
    niftyPePublished: parseNum(row["Nifty 50 PE (Published)"]),
    niftyPeStandalone: parseNum(row["Nifty 50 PE (Standalone Equiv)"]),
    niftyPeMedian: parseNum(row["Nifty 50 PE Median"]),
    pePremiumDiscount: parseNum(row["PE Premium/Discount %"]),
    midcapPePublished: parseNum(row["Midcap 100 PE (Published)"]),
    midcapPeStandalone: parseNum(row["Midcap 100 PE (Standalone Equiv)"]),
    midcapPeMedian: parseNum(row["Midcap PE Median"]),
    midcapPremiumDiscount: parseNum(row["Midcap Premium/Discount %"]),
    smallcapPePublished: parseNum(row["Smallcap 100 PE (Published)"]),
    smallcapPeStandalone: parseNum(row["Smallcap 100 PE (Standalone Equiv)"]),
    smallcapPeMedian: parseNum(row["Smallcap PE Median"]),
    smallcapPremiumDiscount: parseNum(row["Smallcap Premium/Discount %"]),
    niftyPb: parseNum(row["Nifty 50 PB Ratio"]),
    pbMedian: parseNum(row["PB Median"]),
    pbZone: parseStr(row["PB Zone"]),
    dividendYield: parseNum(row["Dividend Yield %"]),
    dyMedian: parseNum(row["DY Median"]),
    dySignal: parseStr(row["DY Signal"]),
    niftyEps: parseNum(row["Nifty EPS (INR)"]),
    epsGrowthYoy: parseNum(row["EPS Growth YoY %"]),
    eps3yCagr: parseNum(row["EPS 3Y CAGR %"]),
    forwardPe: parseNum(row["Forward PE (1Y Consol)"]),
    forwardPeZone: parseStr(row["Forward PE Zone"]),
    impliedEpsGrowth: parseNum(row["Implied EPS Growth %"]),
    msciIndiaPe: parseNum(row["MSCI India PE"]),
    msciEmPe: parseNum(row["MSCI EM PE"]),
    indiaVsEmPremium: parseNum(row["India vs EM Premium %"]),
    indiaVsEmSignal: parseStr(row["India vs EM Signal"]),
    bondYield10y: parseNum(row["India 10Y Bond Yield %"]),
    trailingEarningsYield: parseNum(row["Trailing Earnings Yield %"]),
    forwardEarningsYield: parseNum(row["Forward Earnings Yield %"]),
    trailingErp: parseNum(row["Trailing ERP %"]),
    forwardErp: parseNum(row["Forward ERP %"]),
    erpSignal: parseStr(row["ERP Signal"]),
    fiiNet: parseNum(row["FII Net (INR Cr)"]),
    diiNet: parseNum(row["DII Net (INR Cr)"]),
    sipMonthlyAvg: parseNum(row["SIP Monthly Avg (INR Cr)"]),
    mcapGdp: parseNum(row["Mcap/GDP %"]),
    mcapGdpZone: parseStr(row["Mcap/GDP Zone"]),
    compositeScore: parseNum(row["Composite Score (0-10)"]),
    compositeZone: parseStr(row["Composite Zone"]),
    nifty1yForwardReturn: parseNum(row["Nifty 1Y Forward Return %"]),
  }));

  // Upsert all records
  for (const record of records) {
    await db
      .insert(marketAnnualSnapshots)
      .values(record)
      .onConflictDoUpdate({
        target: marketAnnualSnapshots.year,
        set: record,
      });
    process.stdout.write(`  ✓ ${record.year}\n`);
  }

  console.log(`\nSeeded ${records.length} annual snapshots into Turso.`);

  // Verify
  const result = await client.execute("SELECT COUNT(*) as count FROM market_annual_snapshots");
  console.log(`Verification — rows in DB: ${result.rows[0][0]}`);

  // Sample check
  const sample = await client.execute(
    "SELECT year, nifty_level, nifty_pe_standalone, composite_score, composite_zone FROM market_annual_snapshots ORDER BY year LIMIT 5"
  );
  console.log("\nSample rows:");
  console.table(sample.rows);

  process.exit(0);
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
