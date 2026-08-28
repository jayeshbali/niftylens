/**
 * US Daily Auto-Refresh Pipeline — mirrors app/api/refresh/route.ts.
 *
 * GET  /api/refresh-us  — Vercel Cron (daily, offset a few minutes from
 *                          the India cron to avoid hitting the same
 *                          upstream hosts simultaneously)
 * POST /api/refresh-us  — manual trigger
 *
 * Sources:
 *   1. S&P 500 price         — Yahoo Finance ^GSPC
 *   2. PE / CAPE / PB / DY / Earnings — multpl.com
 *   3. 10Y Treasury yield    — FRED DGS10
 *   4. VIX, HY spread, yield curve, real yield — Yahoo/FRED (bonus, informational)
 *   5. SPY/ACWX ETF PE proxy — Yahoo Finance quoteSummary (cookie+crumb)
 *
 * Derived metrics computed here:
 *   Trailing Earnings Yield = (1 ÷ PE) × 100
 *   Trailing ERP            = Earnings Yield − 10Y Treasury Yield
 */

import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import type { NewUsMarketDailySnapshot } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

import { fetchSp500Price, fetchVix, fetchUsExUsProxies } from "@/lib/data-sources/us/yahoo-us";
import { fetchMultplCurrent } from "@/lib/data-sources/us/multpl";
import { fetchFredLatest } from "@/lib/data-sources/fred";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runRefreshUs();
}

export async function POST() {
  return runRefreshUs();
}

async function runRefreshUs() {
  const fetchedAt = new Date().toISOString();
  const date = fetchedAt.slice(0, 10);

  console.log(`[refresh-us] starting ${date}`);

  const [
    priceRes,
    peRes,
    capeRes,
    pbRes,
    dyRes,
    earningsRes,
    bondRes,
    vixRes,
    hySpreadRes,
    yieldCurveRes,
    realYieldRes,
    exUsRes,
  ] = await Promise.all([
    fetchSp500Price(),
    fetchMultplCurrent("s-p-500-pe-ratio"),
    fetchMultplCurrent("shiller-pe"),
    fetchMultplCurrent("s-p-500-price-to-book"),
    fetchMultplCurrent("s-p-500-dividend-yield"),
    fetchMultplCurrent("s-p-500-earnings"),
    fetchFredLatest("DGS10"),
    fetchVix(),
    fetchFredLatest("BAMLH0A0HYM2"),
    fetchFredLatest("T10Y2Y"),
    fetchFredLatest("DFII10"),
    fetchUsExUsProxies(),
  ]);

  const sp500Level = priceRes.price ?? null;
  const sp500PeTrailing = peRes.value ?? null;
  const capeRatio = capeRes.value ?? null;
  const sp500Pb = pbRes.value ?? null;
  const dividendYield = dyRes.value ?? null;
  const sp500Eps = earningsRes.value ?? null;
  const bondYield10y = bondRes.latest?.value ?? null;
  const vix = vixRes.price ?? null;
  const hySpread = hySpreadRes.latest?.value ?? null;
  const yieldCurve10y2y = yieldCurveRes.latest?.value ?? null;
  const realYield10y = realYieldRes.latest?.value ?? null;
  const usVsExUsPremium = exUsRes.usVsExUsPremium ?? null;

  const trailingEarningsYield =
    sp500PeTrailing !== null && sp500PeTrailing > 0
      ? round2((1 / sp500PeTrailing) * 100)
      : null;

  const trailingErp =
    trailingEarningsYield !== null && bondYield10y !== null
      ? round2(+(trailingEarningsYield - bondYield10y).toFixed(2))
      : null;

  const sourceTags: string[] = [];
  if (priceRes.price) sourceTags.push("yahoo_price");
  if (peRes.value !== undefined) sourceTags.push("multpl_live");
  if (bondRes.latest && !bondRes.error) sourceTags.push("fred_live");
  if (exUsRes.usVsExUsPremium && !exUsRes.fromFallback) sourceTags.push("us_exus_live");
  else if (exUsRes.fromFallback) sourceTags.push("us_exus_fallback");

  const payload: NewUsMarketDailySnapshot = {
    date,
    fetchedAt,
    dataSource: sourceTags.join(",") || "unknown",

    sp500Level,
    sp500PeTrailing,
    sp500Pb,
    dividendYield,
    sp500Eps,
    capeRatio,

    bondYield10y,
    trailingEarningsYield,
    trailingErp,

    usVsExUsPremium,

    vix,
    hySpread,
    yieldCurve10y2y,
    realYield10y,
  };

  await db
    .insert(schema.usMarketDailySnapshots)
    .values(payload)
    .onConflictDoUpdate({
      target: schema.usMarketDailySnapshots.date,
      set: payload,
    });

  console.log(`[refresh-us] done — sources: ${sourceTags.join(", ")}`);

  const errors: Record<string, string> = {};
  if (priceRes.error) errors.sp500Price = priceRes.error;
  if (peRes.error) errors.pe = peRes.error;
  if (capeRes.error) errors.cape = capeRes.error;
  if (pbRes.error) errors.pb = pbRes.error;
  if (dyRes.error) errors.dy = dyRes.error;
  if (earningsRes.error) errors.earnings = earningsRes.error;
  if (bondRes.error) errors.bondYield = bondRes.error;
  if (vixRes.error) errors.vix = vixRes.error;
  if (hySpreadRes.error) errors.hySpread = hySpreadRes.error;
  if (yieldCurveRes.error) errors.yieldCurve = yieldCurveRes.error;
  if (realYieldRes.error) errors.realYield = realYieldRes.error;
  if (exUsRes.error) errors.usVsExUs = exUsRes.error;

  return NextResponse.json({
    success: true,
    date,
    fetchedAt,
    sources: sourceTags,
    data: payload,
    errors: Object.keys(errors).length ? errors : undefined,
  });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
