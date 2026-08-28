/**
 * Yahoo Finance index-level fetcher for the 5 international markets — same
 * v8 chart API pattern as lib/data-sources/yahoo.ts / yahoo-us.ts, generic
 * over ticker. Two ticker gotchas caught by live verification (not from
 * assumption): `^SSEC` is a dead ticker for the Shanghai Composite (use
 * `000001.SS`), and `^TPX`/`^TOPX` don't return a usable TOPIX price on
 * Yahoo (a ticker collision with an unrelated CBOE options index) — use
 * `^N225` (Nikkei 225) for Japan instead. Both already reflected in
 * lib/constants-intl.ts.
 */

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export interface IntlPriceResult {
  price?: number;
  error?: string;
}

export async function fetchIntlIndexLevel(ticker: string): Promise<IntlPriceResult> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`,
      { headers: { "User-Agent": BROWSER_UA, Accept: "application/json" }, cache: "no-store" }
    );
    if (!res.ok) return { error: `HTTP ${res.status}` };

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return { error: "No chart result" };

    const price: number =
      result.meta?.regularMarketPrice ??
      result.indicators?.quote?.[0]?.close?.at(-1);

    if (!price || price <= 0) return { error: `Price ${price} invalid` };

    return { price: Math.round(price * 100) / 100 };
  } catch (err) {
    return { error: String(err) };
  }
}
