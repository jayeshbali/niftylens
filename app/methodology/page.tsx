import Link from "next/link";
import { Footer } from "@/components/Footer";
import { db, schema } from "@/lib/db";
import { desc } from "drizzle-orm";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Methodology & Data Sources — NiftyLens",
  description:
    "Where every number comes from, how derived metrics are calculated, long-term medians, and known limitations.",
};

// ─── Small layout helpers ────────────────────────────────────────────────────

function SectionAnchor({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="text-lg font-semibold mb-4 mt-10 first:mt-0 scroll-mt-20"
      style={{ color: "var(--cyan)" }}
    >
      {children}
    </h2>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold mt-6 mb-2" style={{ color: "var(--text-primary)" }}>
      {children}
    </h3>
  );
}

function Para({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--text-secondary)" }}>
      {children}
    </p>
  );
}

function FormulaBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre
      className="mono text-xs leading-relaxed rounded-lg p-4 mb-4 overflow-x-auto"
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        color: "var(--text-secondary)",
      }}
    >
      {children}
    </pre>
  );
}

type SourceRow = {
  metric: string;
  source: string;
  ticker: string;
  method: string;
  frequency: string;
  lag: string;
};

// ─── India source table ─────────────────────────────────────────────────────

const DATA_SOURCES_INDIA: SourceRow[] = [
  { metric: "Nifty 50 Level", source: "Yahoo Finance", ticker: "^NSEI", method: "REST API (daily close)", frequency: "Daily", lag: "Same day" },
  { metric: "Nifty 50 PE (TTM)", source: "NSE India", ticker: "Index Ratios page", method: "Scrape PE/PB/DY report", frequency: "Daily", lag: "Same day" },
  { metric: "Nifty 50 PB Ratio", source: "NSE India", ticker: "Same as PE", method: "Same as PE", frequency: "Daily", lag: "Same day" },
  { metric: "Nifty 50 Dividend Yield", source: "NSE India", ticker: "Same as PE", method: "Same as PE", frequency: "Daily", lag: "Same day" },
  { metric: "Midcap 100 PE", source: "NSE India", ticker: "NIFTY MIDCAP 100", method: "Same source, different index", frequency: "Daily", lag: "Same day" },
  { metric: "Smallcap 100 PE", source: "NSE India", ticker: "NIFTY SMALLCAP 100", method: "Same source, different index", frequency: "Daily", lag: "Same day" },
  { metric: "India 10Y Bond Yield", source: "Trading Economics / RBI", ticker: "IN10YT=RR", method: "REST API or scrape", frequency: "Daily", lag: "Same day" },
  { metric: "MSCI India PE (proxy)", source: "iShares INDA ETF", ticker: "INDA", method: "Yahoo Finance or Morningstar", frequency: "Daily-ish", lag: "1–2 days" },
  { metric: "MSCI EM PE (proxy)", source: "iShares EEM ETF", ticker: "EEM", method: "Yahoo Finance or Morningstar", frequency: "Daily-ish", lag: "1–2 days" },
  { metric: "FII/FPI Net Flows", source: "NSDL", ticker: "Yearwise report", method: "Scrape monthly summary", frequency: "Monthly", lag: "5–10 days" },
  { metric: "DII Net Flows", source: "NSE India", ticker: "FII/DII report", method: "Scrape", frequency: "Monthly", lag: "5–10 days" },
  { metric: "SIP Monthly Inflows", source: "AMFI", ticker: "Monthly stats", method: "Scrape monthly release", frequency: "Monthly", lag: "15-day lag" },
  { metric: "India Mcap/GDP", source: "BSE + RBI", ticker: "Total mcap ÷ GDP", method: "Computed", frequency: "Quarterly", lag: "1–2 months" },
  { metric: "Forward PE (consensus)", source: "Screener.in / Trendlyne", ticker: "NiftyAggregate", method: "Manual update or scraped", frequency: "Quarterly", lag: "Variable" },
  { metric: "Nifty EPS (TTM)", source: "Derived", ticker: "Nifty Level ÷ PE", method: "Computed daily", frequency: "Daily", lag: "Derived" },
];

const DATA_SOURCES_US: SourceRow[] = [
  { metric: "S&P 500 Level", source: "Yahoo Finance", ticker: "^GSPC", method: "REST API (daily close)", frequency: "Daily", lag: "Same day" },
  { metric: "S&P 500 PE (Trailing)", source: "multpl.com (Shiller data)", ticker: "s-p-500-pe-ratio", method: "Scrape live page", frequency: "Daily", lag: "Same day" },
  { metric: "Shiller CAPE", source: "multpl.com (Shiller data)", ticker: "shiller-pe", method: "Scrape live page", frequency: "Daily", lag: "Same day" },
  { metric: "S&P 500 PB Ratio", source: "multpl.com", ticker: "s-p-500-price-to-book", method: "Scrape live page", frequency: "Daily", lag: "Same day" },
  { metric: "S&P 500 Dividend Yield", source: "multpl.com", ticker: "s-p-500-dividend-yield", method: "Scrape live page", frequency: "Daily", lag: "Same day" },
  { metric: "S&P 500 Earnings", source: "multpl.com (Shiller data)", ticker: "s-p-500-earnings", method: "Scrape live page", frequency: "Daily", lag: "Same day" },
  { metric: "10Y Treasury Yield", source: "FRED (St. Louis Fed)", ticker: "DGS10", method: "Official REST API", frequency: "Daily", lag: "Same day" },
  { metric: "VIX (bonus)", source: "Yahoo Finance", ticker: "^VIX", method: "REST API", frequency: "Daily", lag: "Same day" },
  { metric: "HY Credit Spread (bonus)", source: "FRED", ticker: "BAMLH0A0HYM2", method: "Official REST API", frequency: "Daily", lag: "1 day" },
  { metric: "10Y–2Y Yield Curve (bonus)", source: "FRED", ticker: "T10Y2Y", method: "Official REST API", frequency: "Daily", lag: "Same day" },
  { metric: "Real 10Y Yield (bonus)", source: "FRED", ticker: "DFII10", method: "Official REST API", frequency: "Daily", lag: "Same day" },
  { metric: "US vs Ex-US PE (proxy)", source: "SPY / ACWX ETFs", ticker: "SPY, ACWX", method: "Yahoo Finance quoteSummary", frequency: "Daily-ish", lag: "1–2 days" },
  { metric: "Foreign Net Flows", source: "US Treasury (TIC)", ticker: "TIC report", method: "Manual entry (no free API)", frequency: "Monthly", lag: "~6 weeks" },
  { metric: "Fund Net Flows", source: "ICI", ticker: "Long-term fund flows", method: "Manual entry (no free API)", frequency: "Monthly", lag: "~1 week" },
  { metric: "Forward PE (consensus)", source: "Yardeni Research / FactSet", ticker: "Free chartbook / PDF", method: "Manual entry", frequency: "Weekly", lag: "Variable" },
  { metric: "Mcap/GDP", source: "World Bank Open Data", ticker: "CM.MKT.LCAP.GD.ZS", method: "Official REST API, pre-computed", frequency: "Annual", lag: "Several months" },
  { metric: "AAII Sentiment (bonus)", source: "AAII", ticker: "Weekly survey", method: "Manual entry (no free API)", frequency: "Weekly", lag: "Variable" },
  { metric: "Margin Debt (bonus)", source: "FINRA", ticker: "Margin statistics", method: "Manual entry (no free API)", frequency: "Monthly", lag: "~1 month" },
  { metric: "Top-10 Concentration (bonus)", source: "S&P index factsheets", ticker: "—", method: "Manual entry", frequency: "Quarterly", lag: "Variable" },
];

const LIMITATIONS_INDIA = [
  "Data is approximate. Compiled from public sources, not primary NSE daily data downloads. Individual values may be off by small amounts.",
  "PE standalone adjustment (×1.175) is a fixed estimate. The actual standalone-to-consolidated gap varies by year and index composition. Factor may understate the gap in later years as subsidiary earnings grow.",
  "Long-term medians are approximate. Not computed from raw daily data — derived from published range estimates with different start dates and methodologies (±1–2 turns possible).",
  "Composite score is not backtested. In-sample correlation shown. Scoring rules were designed with knowledge of historical outcomes. Not validated out-of-sample.",
  "No sector composition adjustment. Nifty 50's sectoral mix changes over time (tech-heavy 2000, financials-heavy 2026), affecting what a \"fair\" PE should be.",
  "Forward PE relies on consensus estimates which have a documented 5–15% optimism bias. Realistic forward PE may be 1–2x higher than published.",
  "MSCI India/EM PE are proxied via ETF or secondary sources, not from MSCI's institutional data feed. Actual MSCI index PEs may differ slightly.",
  "Historical data before 2005 is sparser for Midcap and Smallcap indices (launched 2004–05) and for FII/DII flows.",
  "SIP data available from FY17 onward only. Earlier years default to neutral (0.5) in composite score.",
  "This is not investment advice. The dashboard is an educational and analytical tool. Investment decisions should be based on your own research and risk assessment.",
];

const LIMITATIONS_US = [
  "PE, PB, dividend yield, earnings, and CAPE are scraped from multpl.com's live HTML (no JSON API exists) via regex parsing — a page redesign could silently break the scraper.",
  "Long-run medians (1871–present) reflect a fundamentally different valuation regime than today's market — PB and dividend yield especially. Composite score thresholds use modern-regime bands instead; see Section 2.",
  "Composite score is not backtested and mirrors India's structure by design for comparability, not because these exact thresholds are independently optimal for the US market.",
  "Forward PE, foreign flows (TIC), fund flows (ICI), AAII sentiment, margin debt, and index concentration have no free programmatic API and are entered manually — expect more staleness on these fields than the daily-scraped ones.",
  "Mcap/GDP comes from the World Bank's pre-computed ratio (several months' lag), not a live daily reconstruction — FRED discontinued its Wilshire 5000 series in June 2024, which is how this ratio used to be built.",
  "US vs Ex-US premium (SPY/ACWX proxy) is only available from the 2000s onward, and reflects fund-level PE, not the underlying index's true weighted-average PE — same caveat as India's INDA/EEM proxy.",
  "Bonus Risk & Sentiment metrics are informational only and excluded from the Composite Score by design, to keep that score directly comparable to India's.",
  "This is not investment advice. The dashboard is an educational and analytical tool. Investment decisions should be based on your own research and risk assessment.",
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function MethodologyPage({
  searchParams,
}: {
  searchParams: Promise<{ market?: string }>;
}) {
  const { market: marketParam } = await searchParams;
  const market: "india" | "us" = marketParam === "us" ? "us" : "india";

  let lastUpdated: string | undefined;
  try {
    const table = market === "us" ? schema.usMarketDailySnapshots : schema.marketDailySnapshots;
    const [row] = await db
      .select({ fetchedAt: table.fetchedAt })
      .from(table)
      .orderBy(desc(table.id))
      .limit(1);
    lastUpdated = row?.fetchedAt ?? undefined;
  } catch {
    // non-fatal — footer will show "—" gracefully
  }

  const sources = market === "us" ? DATA_SOURCES_US : DATA_SOURCES_INDIA;
  const limitations = market === "us" ? LIMITATIONS_US : LIMITATIONS_INDIA;

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--bg)", color: "var(--text-primary)" }}>
      <header
        className="px-4 py-3 flex items-center gap-4"
        style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
      >
        <Link href="/" className="font-bold text-lg tracking-tight" style={{ color: "var(--cyan)" }}>
          NiftyLens
        </Link>
        <span style={{ color: "var(--border)" }}>·</span>
        <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          Methodology &amp; Data Sources
        </span>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">Methodology &amp; Data Sources</h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Where every number comes from, how derived metrics are calculated, and what the known limitations are.
            </p>
          </div>
          <div
            className="flex items-center gap-1 p-1 rounded-lg shrink-0"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
          >
            <Link
              href="/methodology"
              className="px-3 py-1.5 text-xs font-medium rounded-md"
              style={{
                background: market === "india" ? "var(--surface)" : "transparent",
                color: market === "india" ? "var(--cyan)" : "var(--text-secondary)",
              }}
            >
              🇮🇳 India
            </Link>
            <Link
              href="/methodology?market=us"
              className="px-3 py-1.5 text-xs font-medium rounded-md"
              style={{
                background: market === "us" ? "var(--surface)" : "transparent",
                color: market === "us" ? "var(--cyan)" : "var(--text-secondary)",
              }}
            >
              🇺🇸 US
            </Link>
          </div>
        </div>

        <nav
          className="rounded-lg p-4 mb-10 text-sm"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
            Contents
          </p>
          <ol className="list-decimal list-inside space-y-1.5" style={{ color: "var(--cyan)" }}>
            <li><a href="#data-sources" className="hover:underline">Data Sources — Where Every Number Comes From</a></li>
            <li><a href="#calculations" className="hover:underline">Calculation Methodology — How Derived Metrics Are Computed</a></li>
            <li><a href="#medians" className="hover:underline">Long-term Medians — How They Were Determined</a></li>
            <li><a href="#limitations" className="hover:underline">Known Limitations</a></li>
            <li><a href="#changelog" className="hover:underline">Methodology Changelog</a></li>
          </ol>
        </nav>

        {/* ── Section 1: Data Sources ── */}
        <SectionAnchor id="data-sources">1. Data Sources — Where Every Number Comes From</SectionAnchor>

        <Para>
          Every metric shown on this dashboard has a specific origin. The table below lists the exact source, fetch
          method, update frequency, and typical data lag for each.
        </Para>

        <div className="overflow-x-auto rounded-lg mb-6" style={{ border: "1px solid var(--border)" }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                {["Metric", "Source", "Identifier", "Method", "Frequency", "Lag"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sources.map((row, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                  }}
                >
                  <td className="px-3 py-2 font-medium whitespace-nowrap" style={{ color: "var(--text-primary)" }}>{row.metric}</td>
                  <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>{row.source}</td>
                  <td className="px-3 py-2 mono whitespace-nowrap" style={{ color: "var(--nifty-orange)" }}>{row.ticker}</td>
                  <td className="px-3 py-2" style={{ color: "var(--text-secondary)" }}>{row.method}</td>
                  <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>{row.frequency}</td>
                  <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--text-muted)" }}>{row.lag}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {market === "india" ? (
          <div
            className="rounded-lg p-4 text-xs mb-8"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
          >
            <strong style={{ color: "var(--amber-accent)" }}>Note on MSCI proxies:</strong>{" "}
            MSCI India and MSCI EM PE are proxied via ETF data (INDA, EEM), not sourced from MSCI&apos;s institutional data
            feed. Actual MSCI index PEs may differ slightly.
          </div>
        ) : (
          <div
            className="rounded-lg p-4 text-xs mb-8"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
          >
            <strong style={{ color: "var(--amber-accent)" }}>Note on scraped sources:</strong>{" "}
            multpl.com has no JSON API — PE, CAPE, PB, dividend yield, and earnings are parsed from its live HTML with
            regex, matching this codebase&apos;s no-heavy-deps style. FRED and World Bank fields use official REST
            APIs instead — no scraping, more reliable.
          </div>
        )}

        {/* ── Section 2: Calculation Methodology ── */}
        <SectionAnchor id="calculations">2. Calculation Methodology — How Derived Metrics Are Computed</SectionAnchor>

        {market === "india" ? (
          <>
            <SubHeading>PE Standalone Equivalent (post-April 2021)</SubHeading>
            <FormulaBlock>{`Formula:  Published Consolidated PE × 1.175

Example:  Mar-26 published PE = 19.6x
          Standalone Equiv = 19.6 × 1.175 = 23.0x

Why:      In April 2021, NSE switched PE calculation from standalone to consolidated
          earnings. The 1.175 factor (midpoint of the observed 15–20% gap) restores a
          consistent 26-year series.`}</FormulaBlock>

            <SubHeading>India vs EM Premium</SubHeading>
            <FormulaBlock>{`Formula:  (MSCI India PE ÷ MSCI EM PE − 1) × 100
Example:  MSCI India PE = 21x, MSCI EM PE = 17x → Premium = +24%`}</FormulaBlock>

            <SubHeading>Equity Risk Premium (Trailing)</SubHeading>
            <FormulaBlock>{`Formula:  Trailing Earnings Yield − India 10-Year Government Bond Yield
Example:  Earnings Yield = 5.1%, Bond Yield = 6.9% → Trailing ERP = −1.8%`}</FormulaBlock>

            <SubHeading>Mcap/GDP</SubHeading>
            <FormulaBlock>{`Formula:  BSE Total Market Cap ÷ India Nominal GDP × 100
Updated:  Quarterly, from BSE + RBI data.`}</FormulaBlock>
          </>
        ) : (
          <>
            <SubHeading>PE (Trailing) — No Methodology Break</SubHeading>
            <FormulaBlock>{`Formula:  Price ÷ Trailing 12-Month "As Reported" Earnings

Unlike India (which needed a ×1.175 standalone-equivalence adjustment after NSE's
2021 methodology switch), the US series has no such break — multpl.com's PE ratio
is one continuous series back to 1871, sourced from Robert Shiller's public dataset.`}</FormulaBlock>

            <SubHeading>Shiller CAPE (bonus metric)</SubHeading>
            <FormulaBlock>{`Formula:  Price ÷ 10-Year Average Real (Inflation-Adjusted) Earnings

Why it exists only meaningfully for the US: it requires a long, clean, inflation-
adjusted earnings series — exactly what the Shiller dataset provides and what India's
shorter, methodology-interrupted earnings history doesn't support as cleanly.`}</FormulaBlock>

            <SubHeading>US vs Ex-US Premium</SubHeading>
            <FormulaBlock>{`Formula:  (SPY PE ÷ ACWX PE − 1) × 100
Mirrors India's "India vs EM Premium" tab exactly, with SPY/ACWX (US vs all-country
ex-US) in place of INDA/EEM (India vs EM).`}</FormulaBlock>

            <SubHeading>Equity Risk Premium (Trailing)</SubHeading>
            <FormulaBlock>{`Formula:  Trailing Earnings Yield − US 10-Year Treasury Yield (FRED DGS10)

Unlike India's bond yield (proxied via Yahoo Finance with a DB fallback, since no
clean daily-yield API exists), the US risk-free rate comes from FRED's official
REST API — a materially cleaner data source.`}</FormulaBlock>

            <SubHeading>Mcap/GDP (Buffett Indicator)</SubHeading>
            <FormulaBlock>{`Formula:  US Market Capitalization ÷ US GDP × 100 (World Bank pre-computed ratio)

FRED discontinued its Wilshire 5000 index series in June 2024, which is how this
ratio is conventionally reconstructed (Wilshire 5000 ÷ GDP). This dashboard instead
uses the World Bank's Open Data indicator CM.MKT.LCAP.GD.ZS, which publishes the
ratio directly — no reconstruction needed, official multilateral source, free.`}</FormulaBlock>

            <SubHeading>Composite Score</SubHeading>
            <FormulaBlock>{`Formula:  (Sum of 10 signal scores) ÷ 10 × 10, mirroring India's structure exactly

Thresholds anchor to the modern (post-1990s) valuation regime rather than the full
1871–present median — using the true long-run median for PB (~2.7x) or dividend
yield (~4.0%) would score nearly every modern reading as "bearish," which isn't a
useful signal given the well-documented structural shift toward buybacks and
intangible-heavy balance sheets. See lib/composite-score-us.ts for exact thresholds.`}</FormulaBlock>
          </>
        )}

        {/* ── Section 3: Long-term Medians ── */}
        <SectionAnchor id="medians">3. Long-term Medians — How They Were Determined</SectionAnchor>

        <Para>
          Long-term medians are used to contextualise current readings. {market === "india"
            ? "For India, these are approximate — different start dates and methodologies produce different numbers."
            : "For the US, these are computed from the full 1871–present series ingested by the historical seed script — genuinely computed medians, not consensus estimates."}
        </Para>

        <div className="rounded-lg overflow-hidden mb-6" style={{ border: "1px solid var(--border)" }}>
          {(market === "india"
            ? [
                { metric: "Nifty 50 PE (standalone equiv)", value: "~22.0x", note: "Commonly cited consensus figure. Sensitive to start date — a 10-year median is ~24x; a 20-year median is ~22x." },
                { metric: "Nifty 50 PB", value: "~3.4x", note: "Long-term range 2.0–5.0, midpoint ~3.2–3.6 across sources." },
                { metric: "Nifty 50 Dividend Yield", value: "~1.4%", note: "Historical range 0.93%–2.0%, midpoint ~1.4%." },
              ]
            : [
                { metric: "S&P 500 PE (trailing)", value: "~15.8x", note: "1871–present, via Shiller/multpl.com data." },
                { metric: "Shiller CAPE", value: "~16.0x", note: "1871–present. Long-term average is often cited near 17x; median is somewhat lower." },
                { metric: "S&P 500 PB", value: "~2.7x", note: "Series only available from ~1978 onward. Modern regime (4–5x+) trades well above this." },
                { metric: "S&P 500 Dividend Yield", value: "~4.0%", note: "1871–present. Pre-1990s payout regime dominated by dividends over buybacks — not comparable to modern readings." },
              ]
          ).map((row, i, arr) => (
            <div
              key={i}
              className="px-4 py-3"
              style={{
                borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : undefined,
                background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
              }}
            >
              <div className="flex flex-wrap items-baseline gap-3 mb-1">
                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{row.metric}</span>
                <span className="mono text-sm font-bold" style={{ color: "var(--cyan)" }}>{row.value}</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{row.note}</p>
            </div>
          ))}
        </div>

        {/* ── Section 4: Known Limitations ── */}
        <SectionAnchor id="limitations">4. Known Limitations</SectionAnchor>

        <Para>
          This dashboard is an educational and analytical tool. The following limitations apply to all data shown.
        </Para>

        <ol className="space-y-3 mb-8">
          {limitations.map((text, i) => (
            <li key={i} className="flex gap-3">
              <span className="mono text-xs font-bold shrink-0 mt-0.5 w-5 text-right" style={{ color: "var(--text-muted)" }}>
                {i + 1}.
              </span>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{text}</p>
            </li>
          ))}
        </ol>

        {/* ── Section 5: Changelog ── */}
        <SectionAnchor id="changelog">5. Methodology Changelog</SectionAnchor>

        <Para>Changes to methodology, data sources, or scoring rules are tracked here.</Para>

        <div className="rounded-lg overflow-hidden mb-8" style={{ border: "1px solid var(--border)" }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                {["Date", "Version", "Change", "Rationale"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(market === "india"
                ? [
                    { date: "Apr 2026", version: "v4", change: "Initial dynamic deployment", rationale: "Next.js + Turso + Vercel Cron. 10 metrics, composite scoring, 27-year seed data." },
                    { date: "Apr 2021", version: "—", change: "NSE switched PE from standalone to consolidated", rationale: "Post-2021 PE values adjusted ×1.175 to restore series consistency." },
                  ]
                : [
                    { date: "Aug 2026", version: "v1", change: "Added US market lens", rationale: "Same 10-metric framework applied to the S&P 500 via multpl.com/FRED/World Bank, plus a bonus Risk & Sentiment tab and 1871–present historical seed." },
                    { date: "Jun 2024", version: "—", change: "FRED discontinued its Wilshire 5000 series", rationale: "Mcap/GDP switched to the World Bank's pre-computed ratio instead of a Wilshire ÷ GDP reconstruction." },
                  ]
              ).map((row, i, arr) => (
                <tr key={i} style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : undefined }}>
                  <td className="px-3 py-2 mono whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>{row.date}</td>
                  <td className="px-3 py-2 mono" style={{ color: "var(--cyan)" }}>{row.version}</td>
                  <td className="px-3 py-2" style={{ color: "var(--text-primary)" }}>{row.change}</td>
                  <td className="px-3 py-2" style={{ color: "var(--text-muted)" }}>{row.rationale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-center pt-4 pb-2">
          <Link
            href="/"
            className="text-sm px-4 py-2 rounded-lg transition-colors"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--cyan)" }}
          >
            ← Back to Dashboard
          </Link>
        </div>
      </main>

      <Footer lastUpdated={lastUpdated} />
    </div>
  );
}
