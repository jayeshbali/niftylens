/**
 * One-time historical seed for the US market — fetches live from multpl.com
 * (PE, Shiller CAPE, PB, Dividend Yield, Earnings — full 1871–present series),
 * FRED (10Y Treasury yield — requires FRED_API_KEY), and the World Bank
 * (Mcap/GDP ratio). Unlike India's seed (a static checked-in CSV), this one
 * needs network access at run time.
 *
 * Run: bun scripts/seed-historical-us.ts
 *
 * Raw fetched payloads are saved to data/us-historical-raw.json before
 * upserting, for reproducibility/debugging.
 */

import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { usMarketAnnualSnapshots } from "../lib/db/schema";
import { fetchMultplHistory, type MultplSeries } from "../lib/data-sources/us/multpl";
import { fetchFredHistory } from "../lib/data-sources/us/fred";
import { fetchMcapGdpHistory } from "../lib/data-sources/us/world-bank";
import { computeUsCompositeScore } from "../lib/composite-score-us";
import { SP500_PE_MEDIAN } from "../lib/constants-us";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL!;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_DATABASE_URL) {
  throw new Error("TURSO_DATABASE_URL is not set");
}

const client = createClient({ url: TURSO_DATABASE_URL, authToken: TURSO_AUTH_TOKEN });
const db = drizzle(client);

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** First non-null observation on/after Jan 1 of each year — same "start of year" convention as multpl's tables. */
function firstJanValuePerYear(observations: { date: string; value: number | null }[]): Map<string, number> {
  const byYear = new Map<string, number>();
  for (const o of observations) {
    if (o.value === null) continue;
    const year = o.date.slice(0, 4);
    if (!byYear.has(year)) byYear.set(year, o.value);
  }
  return byYear;
}

function seriesToMap(points: { year: string; value: number }[] | undefined): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of points ?? []) m.set(p.year, p.value);
  return m;
}

async function seed() {
  console.log("Creating table (if not exists)...");
  await client.execute(`
    CREATE TABLE IF NOT EXISTS us_market_annual_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year TEXT NOT NULL UNIQUE,
      sp500_level REAL, sp500_pe_trailing REAL, sp500_pe_median REAL, pe_premium_discount REAL,
      sp500_pb REAL, pb_median REAL, pb_zone TEXT,
      dividend_yield REAL, dy_median REAL, dy_signal TEXT,
      sp500_eps REAL, eps_growth_yoy REAL, eps_3y_cagr REAL,
      forward_pe REAL, forward_pe_zone TEXT, implied_eps_growth REAL,
      cape_ratio REAL, cape_median REAL,
      us_vs_exus_premium REAL, us_vs_exus_signal TEXT,
      bond_yield_10y REAL, trailing_earnings_yield REAL, forward_earnings_yield REAL,
      trailing_erp REAL, forward_erp REAL, erp_signal TEXT,
      foreign_net_flow REAL, fund_net_flow REAL, fund_flow_growth_yoy REAL,
      mcap_gdp REAL, mcap_gdp_zone TEXT,
      composite_score REAL, composite_zone TEXT, sp500_1y_forward_return REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log("Fetching multpl.com historical series...");
  const [peHist, capeHist, pbHist, dyHist, epsHist] = await Promise.all(
    (["s-p-500-pe-ratio", "shiller-pe", "s-p-500-price-to-book", "s-p-500-dividend-yield", "s-p-500-earnings"] as MultplSeries[])
      .map((s) => fetchMultplHistory(s))
  );

  for (const [name, res] of [
    ["PE", peHist], ["CAPE", capeHist], ["PB", pbHist], ["DY", dyHist], ["Earnings", epsHist],
  ] as const) {
    if (res.error) console.warn(`  ⚠ ${name}: ${res.error}`);
    else console.log(`  ✓ ${name}: ${res.points!.length} years`);
  }

  console.log("Fetching FRED 10Y Treasury yield history (requires FRED_API_KEY)...");
  const bondHist = await fetchFredHistory("DGS10");
  if (bondHist.error) console.warn(`  ⚠ Bond yield: ${bondHist.error}`);
  else console.log(`  ✓ Bond yield: ${bondHist.observations!.length} daily observations`);
  const bondByYear = bondHist.observations ? firstJanValuePerYear(bondHist.observations) : new Map();

  console.log("Fetching World Bank Mcap/GDP history...");
  const mcapGdpHist = await fetchMcapGdpHistory();
  if (mcapGdpHist.error) console.warn(`  ⚠ Mcap/GDP: ${mcapGdpHist.error}`);
  else console.log(`  ✓ Mcap/GDP: ${mcapGdpHist.observations!.length} years`);
  const mcapGdpByYear = new Map((mcapGdpHist.observations ?? []).map((o) => [o.year, o.value]));

  // Persist raw payload for reproducibility.
  mkdirSync(join(import.meta.dir, "../data"), { recursive: true });
  writeFileSync(
    join(import.meta.dir, "../data/us-historical-raw.json"),
    JSON.stringify({ peHist, capeHist, pbHist, dyHist, epsHist, bondHist, mcapGdpHist }, null, 2)
  );
  console.log("Saved raw payload to data/us-historical-raw.json");

  const peByYear = seriesToMap(peHist.points);
  const capeByYear = seriesToMap(capeHist.points);
  const pbByYear = seriesToMap(pbHist.points);
  const dyByYear = seriesToMap(dyHist.points);
  const epsByYear = seriesToMap(epsHist.points);

  const allYears = Array.from(peByYear.keys()).sort();
  console.log(`\nBuilding ${allYears.length} annual records (${allYears[0]}–${allYears[allYears.length - 1]})...`);

  const records: (typeof usMarketAnnualSnapshots.$inferInsert)[] = [];

  for (let i = 0; i < allYears.length; i++) {
    const year = allYears[i];
    const sp500PeTrailing = peByYear.get(year) ?? null;
    const capeRatio = capeByYear.get(year) ?? null;
    const sp500Pb = pbByYear.get(year) ?? null;
    const dividendYield = dyByYear.get(year) ?? null;
    const sp500Eps = epsByYear.get(year) ?? null;
    const bondYield10y = bondByYear.get(year) ?? null;
    const mcapGdp = mcapGdpByYear.get(year) ?? null;

    const prevEps = i > 0 ? epsByYear.get(allYears[i - 1]) ?? null : null;
    const epsGrowthYoy =
      sp500Eps !== null && prevEps !== null && prevEps > 0
        ? round2(((sp500Eps - prevEps) / prevEps) * 100)
        : null;

    const prev3Eps = i > 2 ? epsByYear.get(allYears[i - 3]) ?? null : null;
    const eps3yCagr =
      sp500Eps !== null && prev3Eps !== null && prev3Eps > 0
        ? round2(((sp500Eps / prev3Eps) ** (1 / 3) - 1) * 100)
        : null;

    const trailingEarningsYield =
      sp500PeTrailing !== null && sp500PeTrailing > 0
        ? round2((1 / sp500PeTrailing) * 100)
        : null;
    const trailingErp =
      trailingEarningsYield !== null && bondYield10y !== null
        ? round2(trailingEarningsYield - bondYield10y)
        : null;

    const pePremiumDiscount =
      sp500PeTrailing !== null
        ? round2(((sp500PeTrailing - SP500_PE_MEDIAN) / SP500_PE_MEDIAN) * 100)
        : null;

    // No historical data for forward PE, US-vs-ex-US premium (ETFs didn't
    // exist pre-2000s), or foreign/fund flows this far back — null, which
    // computeUsCompositeScore treats as neutral (0.5) per its s3() default.
    const { score: compositeScore, zone: compositeZone } = computeUsCompositeScore({
      sp500PeTrailing,
      sp500Pb,
      dividendYield,
      epsGrowthYoy,
      forwardPe: null,
      usVsExUsPremium: null,
      trailingErp,
      foreignNetFlowAnnual: null,
      fundNetFlowAnnual: null,
      fundFlowGrowthYoy: null,
      mcapGdp,
    });

    records.push({
      year,
      sp500PeTrailing,
      sp500PeMedian: SP500_PE_MEDIAN,
      pePremiumDiscount,
      sp500Pb,
      dividendYield,
      sp500Eps,
      epsGrowthYoy,
      eps3yCagr,
      capeRatio,
      bondYield10y,
      trailingEarningsYield,
      trailingErp,
      mcapGdp,
      compositeScore,
      compositeZone,
    });
  }

  console.log("Upserting into Turso...");
  for (const record of records) {
    await db
      .insert(usMarketAnnualSnapshots)
      .values(record)
      .onConflictDoUpdate({ target: usMarketAnnualSnapshots.year, set: record });
  }
  console.log(`\nSeeded ${records.length} US annual snapshots into Turso.`);

  const result = await client.execute("SELECT COUNT(*) as count FROM us_market_annual_snapshots");
  console.log(`Verification — rows in DB: ${result.rows[0][0]}`);

  const sample = await client.execute(
    "SELECT year, sp500_pe_trailing, cape_ratio, composite_score, composite_zone FROM us_market_annual_snapshots ORDER BY year DESC LIMIT 5"
  );
  console.log("\nMost recent rows:");
  console.table(sample.rows);

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
