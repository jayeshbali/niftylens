/**
 * multpl.com scraper — S&P 500 PE, Shiller CAPE, PB, Dividend Yield, Earnings.
 *
 * multpl.com has no JSON API, so we parse HTML directly with regex (matches
 * this codebase's no-heavy-deps style — no cheerio/jsdom in package.json).
 * Verified structure (Aug 2026):
 *   - Live page <meta name="description"> reads:
 *       "... Current {Label} is {value}{unit}, a change of ..."
 *   - Historical table at `/{series}/table/by-year` is a repeating:
 *       <tr class="odd|even"><td>Jan 1, YYYY</td><td>[marker]VALUE</td></tr>
 *     (plus one "estimate" row for the current year, labeled with today's date)
 *
 * All data ultimately traces back to Robert Shiller's public dataset
 * (econ.yale.edu/~shiller/data.htm), which multpl.com republishes with a
 * cleaner web interface.
 */

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export type MultplSeries =
  | "s-p-500-pe-ratio"
  | "shiller-pe"
  | "s-p-500-price-to-book"
  | "s-p-500-dividend-yield"
  | "s-p-500-earnings";

export interface MultplResult {
  value?: number;
  error?: string;
}

export async function fetchMultplCurrent(series: MultplSeries): Promise<MultplResult> {
  try {
    const res = await fetch(`https://www.multpl.com/${series}`, {
      headers: { "User-Agent": BROWSER_UA },
      cache: "no-store",
    });
    if (!res.ok) return { error: `HTTP ${res.status}` };

    const html = await res.text();
    const match = html.match(/Current [\s\S]*? is ([\d,]+\.?\d*)/);
    if (!match) return { error: "Could not parse current value from page" };

    const value = parseFloat(match[1].replace(/,/g, ""));
    if (isNaN(value)) return { error: `Unparseable value: ${match[1]}` };

    return { value };
  } catch (err) {
    return { error: String(err) };
  }
}

export interface MultplHistoryPoint {
  year: string; // "2025"
  value: number;
}

export interface MultplHistoryResult {
  points?: MultplHistoryPoint[];
  error?: string;
}

/** Full annual history (1871–present where available) for the historical seed. */
export async function fetchMultplHistory(series: MultplSeries): Promise<MultplHistoryResult> {
  try {
    const res = await fetch(`https://www.multpl.com/${series}/table/by-year`, {
      headers: { "User-Agent": BROWSER_UA },
      cache: "no-store",
    });
    if (!res.ok) return { error: `HTTP ${res.status}` };

    const html = await res.text();
    const rowRe = /<tr[^>]*>\s*<td>([^<]+)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/g;
    const points: MultplHistoryPoint[] = [];

    let m: RegExpExecArray | null;
    while ((m = rowRe.exec(html)) !== null) {
      const dateLabel = m[1].trim();
      const valueRaw = m[2]
        .replace(/<[^>]+>/g, "")
        .replace(/&#x2002;| |†|\s/g, "")
        .trim();
      const value = parseFloat(valueRaw.replace(/,/g, ""));
      const yearMatch = dateLabel.match(/(\d{4})/);
      if (!yearMatch || isNaN(value)) continue;
      points.push({ year: yearMatch[1], value });
    }

    if (points.length === 0) return { error: "No rows parsed from table" };

    // Rows are newest-first, including an extra current-year "estimate" row
    // dated today — dedupe by year keeping the first (most recent) value seen.
    const byYear = new Map<string, number>();
    for (const p of points) {
      if (!byYear.has(p.year)) byYear.set(p.year, p.value);
    }

    return {
      points: Array.from(byYear.entries())
        .map(([year, value]) => ({ year, value }))
        .sort((a, b) => a.year.localeCompare(b.year)),
    };
  } catch (err) {
    return { error: String(err) };
  }
}
