/**
 * F6: Auto-Refresh Data Pipeline
 *
 * GET  /api/refresh  — Vercel Cron (daily 13:00 UTC = 6:30 PM IST)
 * POST /api/refresh  — manual trigger
 *
 * Runs all fetchers in parallel; each fails independently.
 * Computes derived metrics after all fetches settle.
 * Writes full payload to market_daily_snapshots (upsert by date).
 *
 * Sources:
 *   1. Nifty 50 price       — Yahoo Finance ^NSEI
 *   2. NSE PE/PB/DY         — nseindia.com/api/allIndices
 *   3. India 10Y bond yield — Yahoo Finance (best-effort, DB fallback)
 *   4. INDA/EEM ETF PE      — Yahoo Finance quoteSummary (cookie+crumb)
 *
 * Derived metrics computed here:
 *   EPS (TTM)              = Nifty Level ÷ Published PE
 *   PE Standalone Equiv    = Published PE × 1.175  (post-Apr 2021)
 *   Trailing Earnings Yield = (1 ÷ PE Standalone) × 100
 *   Trailing ERP           = Earnings Yield − Bond Yield
 */

import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import type { NewMarketDailySnapshot } from "@/lib/db/schema";
import { PE_ADJUSTMENT_FACTOR, PE_CONSOLIDATION_DATE } from "@/lib/constants";
import { fetchNSEData } from "@/lib/data-sources/nse";
import { fetchNiftyPrice, fetchBondYield, fetchMSCIProxies } from "@/lib/data-sources/yahoo";
import { fetchDailyFlows } from "@/lib/data-sources/flows";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runRefresh();
}

export async function POST() {
  return runRefresh();
}

// ─── Orchestrator ────────────────────────────────────────────────────────────

async function runRefresh() {
  const fetchedAt = new Date().toISOString();
  const date = fetchedAt.slice(0, 10);
  const isPostConsolidation = new Date(date) >= PE_CONSOLIDATION_DATE;

  console.log(`[refresh] starting ${date}`);

  // Run all fetchers concurrently; each is independently fault-tolerant
  const [priceRes, nseRes, bondRes, msciRes, flowsRes] = await Promise.all([
    fetchNiftyPrice(),
    fetchNSEData(),
    fetchBondYield(),
    fetchMSCIProxies(),
    fetchDailyFlows(),
  ]);

  // ── Collect raw values ────────────────────────────────────────────────────

  const niftyLevel = priceRes.price ?? nseRes.nifty50?.level ?? null;
  const niftyPePublished = nseRes.nifty50?.pe ?? null;
  const niftyPb = nseRes.nifty50?.pb ?? null;
  const dividendYield = nseRes.nifty50?.dy ?? null;
  const midcapPePublished = nseRes.midcap100?.pe ?? null;
  const smallcapPePublished = nseRes.smallcap100?.pe ?? null;
  const bondYield10y = bondRes.yield ?? null;
  const msciIndiaPe = msciRes.indiaPE ?? null;
  const msciEmPe = msciRes.emPE ?? null;
  const fiiNetDaily = flowsRes.fiiNet ?? null;
  const diiNetDaily = flowsRes.diiNet ?? null;

  // ── Compute derived values ────────────────────────────────────────────────

  // PE standalone equivalent (apply adjustment factor post-Apr 2021)
  const niftyPeStandalone =
    niftyPePublished !== null
      ? round2(niftyPePublished * (isPostConsolidation ? PE_ADJUSTMENT_FACTOR : 1))
      : null;

  const midcapPeStandalone =
    midcapPePublished !== null
      ? round2(midcapPePublished * (isPostConsolidation ? PE_ADJUSTMENT_FACTOR : 1))
      : null;

  const smallcapPeStandalone =
    smallcapPePublished !== null
      ? round2(smallcapPePublished * (isPostConsolidation ? PE_ADJUSTMENT_FACTOR : 1))
      : null;

  // EPS = Level ÷ Published PE (use published/consolidated PE, not standalone)
  const niftyEps =
    niftyLevel !== null && niftyPePublished !== null && niftyPePublished > 0
      ? round2(niftyLevel / niftyPePublished)
      : null;

  // Trailing earnings yield = 1 / standalone PE × 100
  const trailingEarningsYield =
    niftyPeStandalone !== null && niftyPeStandalone > 0
      ? round2((1 / niftyPeStandalone) * 100)
      : null;

  // Trailing ERP = earnings yield − bond yield
  const trailingErp =
    trailingEarningsYield !== null && bondYield10y !== null
      ? round2(+(trailingEarningsYield - bondYield10y).toFixed(2))
      : null;

  // India vs EM premium = (INDA PE / EEM PE − 1) × 100
  const indiaVsEmPremium = msciRes.indiaVsEmPremium ?? null;

  // ── Build DB payload ──────────────────────────────────────────────────────

  const sourceTags: string[] = [];
  if (priceRes.price) sourceTags.push("yahoo_price");
  if (nseRes.nifty50 && !nseRes.fromFallback) sourceTags.push("nse_live");
  else if (nseRes.fromFallback) sourceTags.push("nse_fallback");
  if (bondRes.yield && !bondRes.fromFallback) sourceTags.push("bond_live");
  else if (bondRes.fromFallback) sourceTags.push("bond_fallback");
  if (msciRes.indiaPE && !msciRes.fromFallback) sourceTags.push("msci_live");
  else if (msciRes.fromFallback) sourceTags.push("msci_fallback");
  if (flowsRes.fiiNet !== undefined || flowsRes.diiNet !== undefined) sourceTags.push("flows_live");
  else if (flowsRes.error) sourceTags.push("flows_error");

  const payload: NewMarketDailySnapshot = {
    date,
    fetchedAt,
    dataSource: sourceTags.join(",") || "unknown",

    // Raw from fetchers
    niftyLevel,
    niftyPePublished,
    niftyPb,
    dividendYield,
    midcapPePublished,
    smallcapPePublished,
    bondYield10y,
    msciIndiaPe,
    msciEmPe,

    // Daily flows
    fiiNetDaily,
    diiNetDaily,

    // Derived
    niftyPeStandalone,
    midcapPeStandalone,
    smallcapPeStandalone,
    niftyEps,
    trailingEarningsYield,
    trailingErp,
    indiaVsEmPremium,
  };

  await db
    .insert(schema.marketDailySnapshots)
    .values(payload)
    .onConflictDoUpdate({
      target: schema.marketDailySnapshots.date,
      set: payload,
    });

  console.log(`[refresh] done — sources: ${sourceTags.join(", ")}`);

  // ── Response ──────────────────────────────────────────────────────────────

  const errors: Record<string, string> = {};
  if (priceRes.error) errors.niftyPrice = priceRes.error;
  if (nseRes.error) errors.nse = nseRes.error;
  if (bondRes.error) errors.bondYield = bondRes.error;
  if (msciRes.error) errors.msci = msciRes.error;
  if (flowsRes.error) errors.flows = flowsRes.error;

  return NextResponse.json({
    success: true,
    date,
    fetchedAt,
    sources: sourceTags,
    data: {
      niftyLevel,
      niftyPePublished,
      niftyPeStandalone,
      niftyPb,
      dividendYield,
      niftyEps,
      midcapPePublished,
      midcapPeStandalone,
      smallcapPePublished,
      smallcapPeStandalone,
      bondYield10y,
      trailingEarningsYield,
      trailingErp,
      msciIndiaPe,
      msciEmPe,
      indiaVsEmPremium,
      fiiNetDaily,
      diiNetDaily,
    },
    errors: Object.keys(errors).length ? errors : undefined,
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
