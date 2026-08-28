/**
 * One-time historical seed for the 5 international markets (China, Japan,
 * Germany, UK, France). Unlike India/US, there's no deep-history free
 * source — Siblis Research's free tier only goes back to ~Dec 2023 (China's
 * dividend-yield/CAPE series go back a bit further, to 2021/2023
 * respectively). This *is* the full available history, not a truncated seed.
 *
 * Run: bun scripts/seed-historical-intl.ts
 */

import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { intlMarketSnapshots } from "../lib/db/schema";
import { fetchSiblisSeries } from "../lib/data-sources/siblis";
import { fetchFredHistory } from "../lib/data-sources/fred";
import { fetchMcapGdpHistory } from "../lib/data-sources/world-bank";
import { computeIntlCompositeScore } from "../lib/composite-score-intl";
import { INTL_MARKETS } from "../lib/constants-intl";

const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL!;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_DATABASE_URL) throw new Error("TURSO_DATABASE_URL is not set");

const client = createClient({ url: TURSO_DATABASE_URL, authToken: TURSO_AUTH_TOKEN });
const db = drizzle(client);

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function periodEndDate(period: string): string {
  const [year, month] = period.split("-");
  const lastDay = month === "12" ? "31" : "30"; // Siblis periods are always 6/30 or 12/31
  return `${year}-${month}-${lastDay}`;
}

/** Bond yield as of a period's end date — most recent FRED observation on/before that date. */
function bondYieldAsOf(observations: { date: string; value: number | null }[], period: string): number | null {
  const cutoff = periodEndDate(period);
  let best: number | null = null;
  for (const o of observations) {
    if (o.value === null || o.date > cutoff) continue;
    best = o.value;
  }
  return best;
}

async function seed() {
  for (const market of INTL_MARKETS) {
    console.log(`\n=== ${market.label} ===`);

    const [peRes, dyRes, capeRes, bondHist, mcapGdpHist] = await Promise.all([
      fetchSiblisSeries("pe", market.siblisCountryLabel),
      fetchSiblisSeries("dividendYield", market.siblisCountryLabel),
      fetchSiblisSeries("cape", market.siblisCountryLabel),
      market.bondFredSeries ? fetchFredHistory(market.bondFredSeries) : Promise.resolve({ observations: [] }),
      fetchMcapGdpHistory(market.worldBankCountryCode),
    ]);

    if (peRes.error) {
      console.warn(`  ⚠ PE fetch failed: ${peRes.error} — skipping ${market.label}`);
      continue;
    }
    console.log(`  ✓ PE: ${peRes.points!.length} periods, DY: ${dyRes.points?.length ?? 0}, CAPE: ${capeRes.points?.length ?? 0}`);
    if (market.bondFredSeries) {
      console.log(`  ${bondHist.error ? "⚠" : "✓"} Bond yield: ${bondHist.error ?? `${bondHist.observations!.length} daily observations`}`);
    } else {
      console.log(`  — Bond yield: no free source for ${market.label}, ERP will be null`);
    }
    console.log(`  ${mcapGdpHist.error ? "⚠" : "✓"} Mcap/GDP: ${mcapGdpHist.error ?? `${mcapGdpHist.observations!.length} years`}`);

    const dyByPeriod = new Map((dyRes.points ?? []).map((p) => [p.period, p.value]));
    const capeByPeriod = new Map((capeRes.points ?? []).map((p) => [p.period, p.value]));
    const mcapGdpByYear = new Map((mcapGdpHist.observations ?? []).map((o) => [o.year, o.value]));
    const bondObservations = bondHist.observations ?? [];

    for (const { period, value: peTrailing } of peRes.points!) {
      const dividendYield = dyByPeriod.get(period) ?? null;
      const capeRatio = capeByPeriod.get(period) ?? null;
      const bondYield10y = market.bondFredSeries ? bondYieldAsOf(bondObservations, period) : null;
      const mcapGdp = mcapGdpByYear.get(period.slice(0, 4)) ?? null;

      const trailingEarningsYield = peTrailing > 0 ? round2((1 / peTrailing) * 100) : null;
      const trailingErp =
        trailingEarningsYield !== null && bondYield10y !== null
          ? round2(trailingEarningsYield - bondYield10y)
          : null;

      const { score: compositeScore, zone: compositeZone } = computeIntlCompositeScore({
        peTrailing,
        dividendYield,
        trailingErp,
        mcapGdp,
      });

      const record: typeof intlMarketSnapshots.$inferInsert = {
        market: market.id,
        period,
        peTrailing,
        dividendYield,
        capeRatio,
        bondYield10y,
        trailingEarningsYield,
        trailingErp,
        mcapGdp,
        compositeScore,
        compositeZone,
        dataSource: "siblis_fred_worldbank",
        fetchedAt: new Date().toISOString(),
      };

      await db
        .insert(intlMarketSnapshots)
        .values(record)
        .onConflictDoUpdate({
          target: [intlMarketSnapshots.market, intlMarketSnapshots.period],
          set: record,
        });
      console.log(`  ${period}: PE=${peTrailing} DY=${dividendYield ?? "—"} composite=${compositeScore}`);
    }
  }

  const result = await client.execute("SELECT market, COUNT(*) as count FROM intl_market_snapshots GROUP BY market");
  console.log("\nVerification — rows per market:");
  console.table(result.rows);

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
