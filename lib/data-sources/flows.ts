/**
 * Institutional flow fetchers
 *
 * NSE FII/DII daily trade data
 *   Source: nseindia.com/api/fiidiiTradeReact
 *   Returns today's single-day buy/sell/net for FII/FPI and DII.
 *   No session/cookie required — direct GET with browser headers.
 *
 * SIP monthly inflows: no accessible programmatic API.
 *   Use POST /api/admin/sip for manual entry.
 */

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const NSE_HEADERS = {
  "User-Agent": BROWSER_UA,
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.nseindia.com",
};

// ₹ crore sanity bounds — extreme daily swing would be ±50,000 Cr
const FLOW_MIN = -50_000;
const FLOW_MAX = 50_000;

export interface DailyFlowResult {
  fiiNet?: number;  // ₹ crore
  diiNet?: number;  // ₹ crore
  date?: string;    // "02-Apr-2026" as returned by NSE
  error?: string;
}

export async function fetchDailyFlows(): Promise<DailyFlowResult> {
  try {
    const res = await fetch(
      "https://www.nseindia.com/api/fiidiiTradeReact",
      {
        headers: NSE_HEADERS,
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return { error: `HTTP ${res.status}` };
    }

    // Response: [{ category: "DII", date, buyValue, sellValue, netValue },
    //            { category: "FII/FPI", date, buyValue, sellValue, netValue }]
    const data: Array<{ category: string; date?: string; netValue?: string }> =
      await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      return { error: "Unexpected response format" };
    }

    const fiiRow = data.find(
      (r) => r.category === "FII/FPI" || r.category === "FPI"
    );
    const diiRow = data.find((r) => r.category === "DII");

    const fiiNet = parseFlow(fiiRow?.netValue);
    const diiNet = parseFlow(diiRow?.netValue);
    const date = fiiRow?.date ?? diiRow?.date;

    if (fiiNet === undefined && diiNet === undefined) {
      return { error: "Could not parse any flow values" };
    }

    return { fiiNet, diiNet, date };
  } catch (err) {
    return { error: String(err) };
  }
}

function parseFlow(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = parseFloat(raw.replace(/,/g, ""));
  if (isNaN(n)) return undefined;
  if (n < FLOW_MIN || n > FLOW_MAX) {
    console.warn(`[flows] value ${n} outside bounds [${FLOW_MIN}, ${FLOW_MAX}]`);
    return undefined;
  }
  return Math.round(n * 100) / 100;
}
