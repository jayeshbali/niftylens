/**
 * Yahoo Finance fetchers — US market. Mirrors lib/data-sources/yahoo.ts.
 *
 * 1. S&P 500 price          — v8 chart API for ^GSPC
 * 2. VIX                    — v8 chart API for ^VIX (bonus metric)
 * 3. US vs ex-US ETF PE proxy — SPY vs ACWX (quoteSummary, cookie+crumb)
 *
 * Note on the ETF PE proxy: same caveat as the India INDA/EEM proxy — SPY's/
 * ACWX's own trailing PE differs from the underlying index's weighted-avg PE,
 * but the ratio is still directionally meaningful.
 */

import { db, schema } from "@/lib/db";
import { desc, isNotNull } from "drizzle-orm";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export interface PriceResult {
  price?: number;
  error?: string;
}

async function fetchChartPrice(ticker: string, min: number, max: number): Promise<PriceResult> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`,
      { headers: { "User-Agent": BROWSER_UA, Accept: "application/json" }, cache: "no-store" }
    );
    if (!res.ok) return { error: `HTTP ${res.status}` };

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return { error: "No chart result" };

    const price: number =
      result.meta?.regularMarketPrice ??
      result.indicators?.quote?.[0]?.close?.at(-1);

    if (!price || price < min || price > max) {
      return { error: `Price ${price} outside expected range` };
    }

    return { price: round2(price) };
  } catch (err) {
    return { error: String(err) };
  }
}

const SP500_MIN = 500;
const SP500_MAX = 20_000;

export async function fetchSp500Price(): Promise<PriceResult> {
  return fetchChartPrice("%5EGSPC", SP500_MIN, SP500_MAX);
}

const VIX_MIN = 5;
const VIX_MAX = 150;

export async function fetchVix(): Promise<PriceResult> {
  return fetchChartPrice("%5EVIX", VIX_MIN, VIX_MAX);
}

// ─── SPY / ACWX ETF PE proxy (US vs ex-US) ──────────────────────────────────

const SPY_MIN = 5;
const SPY_MAX = 60;
const ACWX_MIN = 5;
const ACWX_MAX = 50;

export interface UsExUsProxyResult {
  usPE?: number;
  exUsPE?: number;
  usVsExUsPremium?: number;
  error?: string;
  fromFallback?: boolean;
}

export async function fetchUsExUsProxies(): Promise<UsExUsProxyResult> {
  try {
    const cookieRes = await fetch("https://finance.yahoo.com", {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      cache: "no-store",
      redirect: "follow",
    });

    const cookies = cookieRes.headers.get("set-cookie") ?? "";
    const a3Match = cookies.match(/A3=([^;]+)/);
    if (!a3Match) throw new Error("Could not acquire A3 session cookie");
    const cookieHeader = `A3=${a3Match[1]}`;

    const crumbRes = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
      headers: { "User-Agent": BROWSER_UA, Accept: "*/*", Cookie: cookieHeader },
      cache: "no-store",
    });
    const crumb = await crumbRes.text();
    if (!crumb || crumb.includes("{")) throw new Error(`Bad crumb response: ${crumb.slice(0, 80)}`);

    const [usPE, exUsPE] = await Promise.all([
      fetchETFPE("SPY", cookieHeader, crumb, [SPY_MIN, SPY_MAX]),
      fetchETFPE("ACWX", cookieHeader, crumb, [ACWX_MIN, ACWX_MAX]),
    ]);

    if (!usPE && !exUsPE) throw new Error("Both SPY and ACWX PE fetch returned null");

    const usVsExUsPremium = usPE && exUsPE ? round2((usPE / exUsPE - 1) * 100) : undefined;

    return { usPE, exUsPE, usVsExUsPremium };
  } catch (err) {
    console.warn(`[us-exus] fetch failed: ${err}, using DB fallback`);
    return await getLastKnownUsExUs(String(err));
  }
}

async function fetchETFPE(
  ticker: string,
  cookieHeader: string,
  crumb: string,
  bounds: [number, number]
): Promise<number | undefined> {
  try {
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=summaryDetail&crumb=${encodeURIComponent(crumb)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": BROWSER_UA, Accept: "application/json", Cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return undefined;

    const data = await res.json();
    const pe = data?.quoteSummary?.result?.[0]?.summaryDetail?.trailingPE?.raw;

    if (typeof pe !== "number") return undefined;
    if (pe < bounds[0] || pe > bounds[1]) {
      console.warn(`[us-exus] ${ticker} PE=${pe} outside bounds [${bounds}]`);
      return undefined;
    }
    return round2(pe);
  } catch {
    return undefined;
  }
}

async function getLastKnownUsExUs(error: string): Promise<UsExUsProxyResult> {
  try {
    const [row] = await db
      .select({ usVsExUsPremium: schema.usMarketDailySnapshots.usVsExUsPremium })
      .from(schema.usMarketDailySnapshots)
      .where(isNotNull(schema.usMarketDailySnapshots.usVsExUsPremium))
      .orderBy(desc(schema.usMarketDailySnapshots.id))
      .limit(1);

    if (!row) return { error };

    return { fromFallback: true, error, usVsExUsPremium: row.usVsExUsPremium ?? undefined };
  } catch (dbErr) {
    return { error: `${error} | DB fallback failed: ${dbErr}` };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
