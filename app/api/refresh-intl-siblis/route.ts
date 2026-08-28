/**
 * Siblis Research refresh for the 5 international markets — PE, dividend
 * yield, CAPE (semi-annual, free tier) + FRED 10Y bond yield (daily, but
 * only fetched here since it's paired with the semi-annual valuation data
 * for the ERP calc) + World Bank Mcap/GDP (annual). Computes trailing ERP
 * and the composite score, upserts the latest period for each market.
 *
 * Siblis only updates twice a year, so this doesn't need a daily cron —
 * trigger manually or cron it monthly.
 *
 * POST /api/refresh-intl-siblis
 * Protected by ADMIN_SECRET / CRON_SECRET env var.
 */

import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import type { NewIntlMarketSnapshot } from "@/lib/db/schema";
import { INTL_MARKETS } from "@/lib/constants-intl";
import { fetchSiblisSeries } from "@/lib/data-sources/siblis";
import { fetchFredLatest, type FredResult } from "@/lib/data-sources/fred";
import { fetchMcapGdpLatest } from "@/lib/data-sources/world-bank";
import { computeIntlCompositeScore } from "@/lib/composite-score-intl";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.ADMIN_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fetchedAt = new Date().toISOString();
  const results = await Promise.all(INTL_MARKETS.map((m) => refreshOne(m, fetchedAt)));

  return NextResponse.json({ success: true, results });
}

async function fetchBondYield(seriesId: string | null): Promise<FredResult> {
  if (!seriesId) return { error: "no free bond-yield source for this market" };
  return fetchFredLatest(seriesId);
}

async function refreshOne(market: (typeof INTL_MARKETS)[number], fetchedAt: string) {
  const [peRes, dyRes, capeRes, bondRes, mcapGdpRes] = await Promise.all([
    fetchSiblisSeries("pe", market.siblisCountryLabel),
    fetchSiblisSeries("dividendYield", market.siblisCountryLabel),
    fetchSiblisSeries("cape", market.siblisCountryLabel),
    fetchBondYield(market.bondFredSeries),
    fetchMcapGdpLatest(market.worldBankCountryCode),
  ]);

  const peTrailing = peRes.points?.at(-1)?.value ?? null;
  const period = peRes.points?.at(-1)?.period ?? null;
  const dividendYield = dyRes.points?.at(-1)?.value ?? null;
  const capeRatio = capeRes.points?.at(-1)?.value ?? null;
  const bondYield10y = bondRes.latest?.value ?? null;
  const mcapGdp = mcapGdpRes.latest?.value ?? null;

  if (!period) {
    return { market: market.id, error: "No PE data — could not determine period" };
  }

  const trailingEarningsYield =
    peTrailing !== null && peTrailing > 0 ? round2((1 / peTrailing) * 100) : null;
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

  const payload: NewIntlMarketSnapshot = {
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
    fetchedAt,
  };

  await db
    .insert(schema.intlMarketSnapshots)
    .values(payload)
    .onConflictDoUpdate({
      target: [schema.intlMarketSnapshots.market, schema.intlMarketSnapshots.period],
      set: payload,
    });

  return { market: market.id, period, peTrailing, compositeScore, compositeZone };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
