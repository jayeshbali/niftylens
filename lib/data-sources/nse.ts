/**
 * NSE India PE/PB/Dividend Yield fetcher
 *
 * Source: nseindia.com/api/allIndices
 * No session/cookie required — direct GET with browser-like headers.
 * Returns current-day values for Nifty 50, Midcap 100, Smallcap 100.
 *
 * All PE values returned by NSE are on a CONSOLIDATED basis (post-April 2021).
 * Callers are responsible for applying PE_ADJUSTMENT_FACTOR for standalone equiv.
 */

import { db, schema } from "@/lib/db";
import { desc, isNotNull } from "drizzle-orm";

// Validation bounds (from F-Data Validation Rules in requirements)
const BOUNDS = {
  pe: [5, 200] as const,       // high bound relaxed for midcap/smallcap
  pb: [1.0, 8.0] as const,
  dy: [0.1, 4.0] as const,
  level: [500, 500_000] as const,
};

export interface NSEIndexData {
  pe: number;
  pb?: number;
  dy?: number;
  level?: number;
}

export interface NSEResult {
  nifty50?: NSEIndexData;
  midcap100?: NSEIndexData;
  smallcap100?: NSEIndexData;
  error?: string;
  fromFallback?: boolean;
}

const NSE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.nseindia.com",
};

function inRange(val: number, [lo, hi]: readonly [number, number]): boolean {
  return val >= lo && val <= hi;
}

function parseAndValidate(
  raw: Record<string, string>,
  key: string,
  bounds: readonly [number, number]
): number | undefined {
  const s = raw[key];
  if (!s || s === "-") return undefined;
  const n = parseFloat(s);
  if (isNaN(n)) return undefined;
  if (!inRange(n, bounds)) {
    console.warn(`[nse] ${key}=${n} outside bounds [${bounds[0]}, ${bounds[1]}]`);
    return undefined;
  }
  return n;
}

async function fetchOnce(): Promise<NSEResult> {
  const res = await fetch("https://www.nseindia.com/api/allIndices", {
    headers: NSE_HEADERS,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const data = await res.json();
  const items: Array<Record<string, string>> = data?.data ?? [];

  if (!items.length) {
    throw new Error("Empty data array");
  }

  const find = (name: string) => items.find((x) => x.index === name);

  const toIndexData = (item: Record<string, string> | undefined): NSEIndexData | undefined => {
    if (!item) return undefined;
    const pe = parseAndValidate(item, "pe", BOUNDS.pe);
    if (pe === undefined) return undefined; // PE is required
    return {
      pe,
      pb: parseAndValidate(item, "pb", BOUNDS.pb),
      dy: parseAndValidate(item, "dy", BOUNDS.dy),
      level: parseAndValidate(item, "last", BOUNDS.level),
    };
  };

  const result: NSEResult = {
    nifty50: toIndexData(find("NIFTY 50")),
    midcap100: toIndexData(find("NIFTY MIDCAP 100")),
    smallcap100: toIndexData(find("NIFTY SMALLCAP 100")),
  };

  if (!result.nifty50) {
    throw new Error("Nifty 50 data missing or invalid in response");
  }

  return result;
}

// ─── Retry with exponential backoff ────────────────────────────────────────

const MAX_RETRIES = 3;

export async function fetchNSEData(): Promise<NSEResult> {
  let lastError = "";

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await fetchOnce();
      if (attempt > 0) {
        console.log(`[nse] succeeded on attempt ${attempt + 1}`);
      }
      return result;
    } catch (err) {
      lastError = String(err);
      console.warn(`[nse] attempt ${attempt + 1} failed: ${lastError}`);
      if (attempt < MAX_RETRIES - 1) {
        await sleep(1000 * 2 ** attempt); // 1s, 2s, 4s
      }
    }
  }

  // All retries exhausted → fall back to last known good DB values
  console.warn("[nse] all retries failed, using last known DB values");
  return await getLastKnownNSE(lastError);
}

// ─── DB fallback ────────────────────────────────────────────────────────────

async function getLastKnownNSE(error: string): Promise<NSEResult> {
  try {
    const [row] = await db
      .select({
        niftyPePublished: schema.marketDailySnapshots.niftyPePublished,
        niftyPb: schema.marketDailySnapshots.niftyPb,
        dividendYield: schema.marketDailySnapshots.dividendYield,
        niftyLevel: schema.marketDailySnapshots.niftyLevel,
        midcapPePublished: schema.marketDailySnapshots.midcapPePublished,
        smallcapPePublished: schema.marketDailySnapshots.smallcapPePublished,
      })
      .from(schema.marketDailySnapshots)
      .where(isNotNull(schema.marketDailySnapshots.niftyPePublished))
      .orderBy(desc(schema.marketDailySnapshots.id))
      .limit(1);

    if (!row) {
      return { error: `fetch failed and no DB fallback: ${error}` };
    }

    return {
      fromFallback: true,
      error,
      nifty50: {
        pe: row.niftyPePublished!,
        pb: row.niftyPb ?? undefined,
        dy: row.dividendYield ?? undefined,
        level: row.niftyLevel ?? undefined,
      },
      midcap100: row.midcapPePublished ? { pe: row.midcapPePublished } : undefined,
      smallcap100: row.smallcapPePublished ? { pe: row.smallcapPePublished } : undefined,
    };
  } catch (dbErr) {
    return { error: `fetch failed (${error}) and DB fallback failed (${dbErr})` };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
