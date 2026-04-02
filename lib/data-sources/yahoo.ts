/**
 * Yahoo Finance fetchers
 *
 * 1. Nifty 50 price  — v8 chart API for ^NSEI (no auth needed)
 * 2. Bond yield       — v8 chart API; tries multiple ticker formats,
 *                       falls back to last known DB value
 * 3. ETF PE proxies   — INDA + EEM via quoteSummary (requires cookie + crumb)
 *
 * Note on ETF PE proxies:
 *   Yahoo Finance `summaryDetail.trailingPE` for ETFs reflects the fund's own
 *   trailing PE, which differs from the MSCI index's weighted-avg portfolio PE.
 *   Values are stored as proxy indicators only — absolute levels do NOT match
 *   the MSCI-published PEs used in historical annual snapshots.
 *   The India vs EM ratio computed from these values is still directionally
 *   meaningful as a trend signal.
 */

import { db, schema } from "@/lib/db";
import { desc, isNotNull } from "drizzle-orm";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

// ─── Nifty 50 price ─────────────────────────────────────────────────────────

const NIFTY_MIN = 500;
const NIFTY_MAX = 200_000;

export interface PriceResult {
  price?: number;
  error?: string;
}

export async function fetchNiftyPrice(): Promise<PriceResult> {
  try {
    const res = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI?interval=1d&range=1d",
      {
        headers: { "User-Agent": BROWSER_UA, Accept: "application/json" },
        cache: "no-store",
      }
    );
    if (!res.ok) return { error: `HTTP ${res.status}` };

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return { error: "No chart result" };

    const price: number =
      result.meta?.regularMarketPrice ??
      result.indicators?.quote?.[0]?.close?.at(-1);

    if (!price || price < NIFTY_MIN || price > NIFTY_MAX) {
      return { error: `Price ${price} outside expected range` };
    }

    return { price: round2(price) };
  } catch (err) {
    return { error: String(err) };
  }
}

// ─── India 10Y bond yield ────────────────────────────────────────────────────
//
// Yahoo Finance does not carry the India 10Y G-Sec yield as of 2026.
// We try two tickers and fall back to the last known value from the DB.
// Bounds from requirements: 3.0–14.0%.

const BOND_MIN = 3.0;
const BOND_MAX = 14.0;
const BOND_TICKERS = [
  "IN10YT%3DRR",   // Reuters format  (IN10YT=RR)
  "%5EINRX",       // CBOE-style
  "INDIABOND10.BO",
];

export interface BondYieldResult {
  yield?: number;
  error?: string;
  fromFallback?: boolean;
}

export async function fetchBondYield(): Promise<BondYieldResult> {
  // Try each ticker until one returns a valid value
  for (const ticker of BOND_TICKERS) {
    try {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=5d`,
        {
          headers: { "User-Agent": BROWSER_UA, Accept: "application/json" },
          cache: "no-store",
        }
      );
      if (!res.ok) continue;

      const data = await res.json();
      const r = data?.chart?.result?.[0];
      if (!r) continue;

      const raw: number =
        r.meta?.regularMarketPrice ??
        r.indicators?.quote?.[0]?.close?.filter(Boolean)?.at(-1);

      if (raw && raw >= BOND_MIN && raw <= BOND_MAX) {
        return { yield: round2(raw) };
      }
    } catch {
      // try next ticker
    }
  }

  // Fall back to last known DB value
  return await getLastKnownBondYield();
}

async function getLastKnownBondYield(): Promise<BondYieldResult> {
  try {
    const [row] = await db
      .select({ bondYield10y: schema.marketDailySnapshots.bondYield10y })
      .from(schema.marketDailySnapshots)
      .where(isNotNull(schema.marketDailySnapshots.bondYield10y))
      .orderBy(desc(schema.marketDailySnapshots.id))
      .limit(1);

    if (row?.bondYield10y) {
      console.warn(`[bond] using last known DB value: ${row.bondYield10y}`);
      return { yield: row.bondYield10y, fromFallback: true };
    }
    return { error: "No bond yield data available" };
  } catch (err) {
    return { error: `DB fallback failed: ${err}` };
  }
}

// ─── INDA / EEM ETF PE proxies ───────────────────────────────────────────────
//
// Requires two-step Yahoo Finance auth:
//   1. GET finance.yahoo.com  → sets A3 session cookie
//   2. GET .../v1/test/getcrumb  → returns crumb token
//   3. GET .../quoteSummary/{ticker}?modules=summaryDetail&crumb={crumb}

const INDA_MIN = 5;
const INDA_MAX = 80;
const EEM_MIN = 5;
const EEM_MAX = 50;

export interface MSCIProxyResult {
  indiaPE?: number;
  emPE?: number;
  indiaVsEmPremium?: number;
  error?: string;
  fromFallback?: boolean;
}

export async function fetchMSCIProxies(): Promise<MSCIProxyResult> {
  try {
    // Step 1: acquire cookie
    const cookieRes = await fetch("https://finance.yahoo.com", {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      cache: "no-store",
      redirect: "follow",
    });

    const cookies = cookieRes.headers.get("set-cookie") ?? "";
    // Extract A3 cookie (Yahoo Finance session identifier)
    const a3Match = cookies.match(/A3=([^;]+)/);
    if (!a3Match) {
      throw new Error("Could not acquire A3 session cookie");
    }
    const cookieHeader = `A3=${a3Match[1]}`;

    // Step 2: get crumb
    const crumbRes = await fetch(
      "https://query2.finance.yahoo.com/v1/test/getcrumb",
      {
        headers: {
          "User-Agent": BROWSER_UA,
          Accept: "*/*",
          Cookie: cookieHeader,
        },
        cache: "no-store",
      }
    );
    const crumb = await crumbRes.text();
    if (!crumb || crumb.includes("{")) {
      throw new Error(`Bad crumb response: ${crumb.slice(0, 80)}`);
    }

    // Step 3: fetch INDA and EEM PE in parallel
    const [indiaPE, emPE] = await Promise.all([
      fetchETFPE("INDA", cookieHeader, crumb, [INDA_MIN, INDA_MAX]),
      fetchETFPE("EEM", cookieHeader, crumb, [EEM_MIN, EEM_MAX]),
    ]);

    if (!indiaPE && !emPE) {
      throw new Error("Both INDA and EEM PE fetch returned null");
    }

    const indiaVsEmPremium =
      indiaPE && emPE ? round2((indiaPE / emPE - 1) * 100) : undefined;

    return { indiaPE, emPE, indiaVsEmPremium };
  } catch (err) {
    console.warn(`[msci] fetch failed: ${err}, using DB fallback`);
    return await getLastKnownMSCI(String(err));
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
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "application/json",
        Cookie: cookieHeader,
      },
      cache: "no-store",
    });
    if (!res.ok) return undefined;

    const data = await res.json();
    const pe = data?.quoteSummary?.result?.[0]?.summaryDetail?.trailingPE?.raw;

    if (typeof pe !== "number") return undefined;
    if (pe < bounds[0] || pe > bounds[1]) {
      console.warn(`[msci] ${ticker} PE=${pe} outside bounds [${bounds}]`);
      return undefined;
    }

    return round2(pe);
  } catch {
    return undefined;
  }
}

async function getLastKnownMSCI(error: string): Promise<MSCIProxyResult> {
  try {
    const [row] = await db
      .select({
        msciIndiaPe: schema.marketDailySnapshots.msciIndiaPe,
        msciEmPe: schema.marketDailySnapshots.msciEmPe,
        indiaVsEmPremium: schema.marketDailySnapshots.indiaVsEmPremium,
      })
      .from(schema.marketDailySnapshots)
      .where(isNotNull(schema.marketDailySnapshots.msciIndiaPe))
      .orderBy(desc(schema.marketDailySnapshots.id))
      .limit(1);

    if (!row) return { error };

    return {
      fromFallback: true,
      error,
      indiaPE: row.msciIndiaPe ?? undefined,
      emPE: row.msciEmPe ?? undefined,
      indiaVsEmPremium: row.indiaVsEmPremium ?? undefined,
    };
  } catch (dbErr) {
    return { error: `${error} | DB fallback failed: ${dbErr}` };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
