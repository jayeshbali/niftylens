/**
 * FRED (Federal Reserve Economic Data) fetcher — official REST API, requires
 * one free API key (fred.stlouisfed.org/docs/api/api_key.html) set as
 * FRED_API_KEY. No scraping, no cookies.
 *
 * Used for:
 *   DGS10          — 10Y Treasury Constant Maturity Rate (ERP risk-free rate)
 *   BAMLH0A0HYM2   — ICE BofA US High Yield Index Option-Adjusted Spread (bonus)
 *   T10Y2Y         — 10Y minus 2Y Treasury spread, yield curve (bonus)
 *   DFII10         — 10Y Treasury Inflation-Indexed (real) yield (bonus)
 *
 * Note: FRED discontinued its Wilshire 5000 index series in June 2024
 * (news.research.stlouisfed.org/2024/04/fred-will-remove-wilshire-index-data-on-june-3-2024/),
 * so Mcap/GDP is sourced from the World Bank instead — see world-bank.ts.
 */

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";

export interface FredObservation {
  date: string; // "2026-04-02"
  value: number | null; // null when FRED reports "." (no data that day)
}

export interface FredResult {
  latest?: FredObservation;
  observations?: FredObservation[];
  error?: string;
}

function parseObservations(raw: Array<{ date: string; value: string }>): FredObservation[] {
  return raw.map((o) => ({
    date: o.date,
    value: o.value === "." ? null : parseFloat(o.value),
  }));
}

/** Most recent non-null observation for a series. */
export async function fetchFredLatest(seriesId: string): Promise<FredResult> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) return { error: "FRED_API_KEY not set" };

  try {
    const url = `${FRED_BASE}?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=10`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { error: `HTTP ${res.status}` };

    const data = await res.json();
    const obs = parseObservations(data?.observations ?? []);
    const latest = obs.find((o) => o.value !== null);
    if (!latest) return { error: "No non-null observations in recent window" };

    return { latest, observations: obs };
  } catch (err) {
    return { error: String(err) };
  }
}

/** Full history for a series, ascending — used by the historical seed script. */
export async function fetchFredHistory(seriesId: string): Promise<FredResult> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) return { error: "FRED_API_KEY not set" };

  try {
    const url = `${FRED_BASE}?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=asc`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { error: `HTTP ${res.status}` };

    const data = await res.json();
    return { observations: parseObservations(data?.observations ?? []) };
  } catch (err) {
    return { error: String(err) };
  }
}
