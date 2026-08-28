/**
 * World Bank Open Data — free, no API key, no scraping.
 * Indicator CM.MKT.LCAP.GD.ZS: "Market capitalization of listed domestic
 * companies (% of GDP)" — the Mcap/GDP ("Buffett Indicator") ratio, published
 * pre-computed, annually, with a several-month lag.
 *
 * Chosen over reconstructing Wilshire 5000 ÷ GDP because FRED discontinued
 * its Wilshire index series in June 2024 — see fred.ts's note.
 */

const WB_URL =
  "https://api.worldbank.org/v2/country/US/indicator/CM.MKT.LCAP.GD.ZS?format=json&per_page=200";

export interface McapGdpObservation {
  year: string; // "2025"
  value: number; // percent
}

export interface McapGdpResult {
  latest?: McapGdpObservation;
  observations?: McapGdpObservation[];
  error?: string;
}

interface WBRow {
  date: string;
  value: number | null;
}

export async function fetchMcapGdpHistory(): Promise<McapGdpResult> {
  try {
    const res = await fetch(WB_URL, { cache: "no-store" });
    if (!res.ok) return { error: `HTTP ${res.status}` };

    const data = await res.json();
    const rows: WBRow[] = data?.[1] ?? [];
    if (!Array.isArray(rows) || rows.length === 0) return { error: "Empty response" };

    const observations = rows
      .filter((r) => r.value !== null)
      .map((r) => ({ year: r.date, value: round2(r.value as number) }))
      .sort((a, b) => a.year.localeCompare(b.year));

    if (observations.length === 0) return { error: "No non-null observations" };

    return { observations };
  } catch (err) {
    return { error: String(err) };
  }
}

export async function fetchMcapGdpLatest(): Promise<McapGdpResult> {
  const history = await fetchMcapGdpHistory();
  if (history.error || !history.observations?.length) return history;
  return {
    latest: history.observations[history.observations.length - 1],
    observations: history.observations,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
