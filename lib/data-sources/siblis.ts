/**
 * Siblis Research (siblisresearch.com) — free HTML tables covering PE ratio,
 * dividend yield, and CAPE by country. One shared scraper for all 5
 * international markets (verified live for China/Japan/Germany/UK/France).
 *
 * Table markup is a Handsontable/wpDataTable export: every cell carries
 * data-cell-id="{COL}{ROW}" and data-original-value="...". Layout differs
 * slightly per page (the PE page has a label column before values start;
 * dividend-yield/CAPE pages start values right after the index-name column),
 * so instead of hardcoding column letters, this parser:
 *   1. Reads the header row (row 1) to find which columns hold date labels
 *      (format M/D/YYYY) — this auto-detects where values start.
 *   2. Finds the row whose first column matches the country's exact label
 *      (e.g. "United Kingdom", "China") — country rows on the PE page span
 *      3 sub-rows (P/E, EPS, growth), but the country name always appears
 *      on the first (P/E) sub-row, so no special-casing needed.
 *   3. Reads the same date columns from that row.
 *
 * Free tier is semi-annual snapshots back to ~Dec 2023 — this genuinely is
 * the full available history, not a truncated view.
 */

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export const SIBLIS_PAGES = {
  pe: "https://siblisresearch.com/data/pe-ratios-by-country/",
  dividendYield: "https://siblisresearch.com/data/global-dividend-yields/",
  cape: "https://siblisresearch.com/data/cape-ratios-by-country/",
} as const;

export type SiblisPage = keyof typeof SIBLIS_PAGES;

export interface SiblisPoint {
  period: string; // "2025-12"
  value: number;
}

export interface SiblisResult {
  points?: SiblisPoint[]; // sorted ascending by period; [0] = oldest
  error?: string;
}

function dateToPeriod(mdY: string): string | null {
  const m = mdY.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, month, , year] = m;
  return `${year}-${month.padStart(2, "0")}`;
}

export async function fetchSiblisSeries(page: SiblisPage, countryLabel: string): Promise<SiblisResult> {
  try {
    const res = await fetch(SIBLIS_PAGES[page], { headers: { "User-Agent": BROWSER_UA }, cache: "no-store" });
    if (!res.ok) return { error: `HTTP ${res.status}` };

    const html = await res.text();

    // Header row: find date-labeled columns.
    const headerRe = /data-cell-id="([A-Z]+)1"[^>]*data-original-value="(\d{1,2}\/\d{1,2}\/\d{4})"/g;
    const dateColumns: { col: string; period: string }[] = [];
    let hm: RegExpExecArray | null;
    while ((hm = headerRe.exec(html)) !== null) {
      const period = dateToPeriod(hm[2]);
      if (period) dateColumns.push({ col: hm[1], period });
    }
    if (dateColumns.length === 0) return { error: "No date columns found in header row" };

    // Country row: match column A's cell for this exact country label.
    const countryRe = new RegExp(
      `data-cell-id="A(\\d+)"[^>]*data-original-value="${countryLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`
    );
    const cm = countryRe.exec(html);
    if (!cm) return { error: `Country row not found: "${countryLabel}"` };
    const rowY = cm[1];

    const points: SiblisPoint[] = [];
    for (const { col, period } of dateColumns) {
      const cellRe = new RegExp(`data-cell-id="${col}${rowY}"[^>]*data-original-value="([^"]*)"`);
      const vm = cellRe.exec(html);
      if (!vm) continue;
      const raw = vm[1].replace("%", "").trim();
      if (!raw) continue;
      const value = parseFloat(raw);
      if (isNaN(value)) continue;
      points.push({ period, value });
    }

    if (points.length === 0) return { error: `No values parsed for "${countryLabel}"` };

    return { points: points.sort((a, b) => a.period.localeCompare(b.period)) };
  } catch (err) {
    return { error: String(err) };
  }
}
