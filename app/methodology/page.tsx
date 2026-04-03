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

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code
      className="mono px-1.5 py-0.5 rounded text-xs"
      style={{ background: "var(--surface-2)", color: "var(--nifty-orange)" }}
    >
      {children}
    </code>
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

// ─── Source table ────────────────────────────────────────────────────────────

const DATA_SOURCES = [
  {
    metric: "Nifty 50 Level",
    source: "Yahoo Finance",
    url: "finance.yahoo.com",
    ticker: "^NSEI",
    method: "REST API (daily close)",
    frequency: "Daily",
    lag: "Same day",
  },
  {
    metric: "Nifty 50 PE (TTM)",
    source: "NSE India",
    url: "niftyindices.com",
    ticker: "Index Ratios page",
    method: "Scrape PE/PB/DY report",
    frequency: "Daily",
    lag: "Same day",
  },
  {
    metric: "Nifty 50 PB Ratio",
    source: "NSE India",
    url: "niftyindices.com",
    ticker: "Same as PE",
    method: "Same as PE",
    frequency: "Daily",
    lag: "Same day",
  },
  {
    metric: "Nifty 50 Dividend Yield",
    source: "NSE India",
    url: "niftyindices.com",
    ticker: "Same as PE",
    method: "Same as PE",
    frequency: "Daily",
    lag: "Same day",
  },
  {
    metric: "Midcap 100 PE",
    source: "NSE India",
    url: "niftyindices.com",
    ticker: "NIFTY MIDCAP 100",
    method: "Same source, different index",
    frequency: "Daily",
    lag: "Same day",
  },
  {
    metric: "Smallcap 100 PE",
    source: "NSE India",
    url: "niftyindices.com",
    ticker: "NIFTY SMALLCAP 100",
    method: "Same source, different index",
    frequency: "Daily",
    lag: "Same day",
  },
  {
    metric: "India 10Y Bond Yield",
    source: "Trading Economics / RBI",
    url: "tradingeconomics.com",
    ticker: "IN10YT=RR",
    method: "REST API or scrape",
    frequency: "Daily",
    lag: "Same day",
  },
  {
    metric: "MSCI India PE (proxy)",
    source: "iShares INDA ETF",
    url: "finance.yahoo.com",
    ticker: "INDA",
    method: "Yahoo Finance or Morningstar",
    frequency: "Daily-ish",
    lag: "1–2 days",
  },
  {
    metric: "MSCI EM PE (proxy)",
    source: "iShares EEM ETF",
    url: "finance.yahoo.com",
    ticker: "EEM",
    method: "Yahoo Finance or Morningstar",
    frequency: "Daily-ish",
    lag: "1–2 days",
  },
  {
    metric: "FII/FPI Net Flows",
    source: "NSDL",
    url: "fpi.nsdl.co.in",
    ticker: "Yearwise report",
    method: "Scrape monthly summary",
    frequency: "Monthly",
    lag: "5–10 days",
  },
  {
    metric: "DII Net Flows",
    source: "NSE India",
    url: "nseindia.com",
    ticker: "FII/DII report",
    method: "Scrape",
    frequency: "Monthly",
    lag: "5–10 days",
  },
  {
    metric: "SIP Monthly Inflows",
    source: "AMFI",
    url: "amfiindia.com",
    ticker: "Monthly stats",
    method: "Scrape monthly release",
    frequency: "Monthly",
    lag: "15-day lag",
  },
  {
    metric: "India Mcap/GDP",
    source: "BSE + RBI",
    url: "bseindia.com / rbi.org.in",
    ticker: "Total mcap ÷ GDP",
    method: "Computed",
    frequency: "Quarterly",
    lag: "1–2 months",
  },
  {
    metric: "Forward PE (consensus)",
    source: "Screener.in / Trendlyne",
    url: "screener.in",
    ticker: "NiftyAggregate",
    method: "Manual update or scraped",
    frequency: "Quarterly",
    lag: "Variable",
  },
  {
    metric: "Nifty EPS (TTM)",
    source: "Derived",
    url: "—",
    ticker: "Nifty Level ÷ PE",
    method: "Computed daily",
    frequency: "Daily",
    lag: "Derived",
  },
];

// ─── Limitations list ────────────────────────────────────────────────────────

const LIMITATIONS = [
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

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function MethodologyPage() {
  let lastUpdated: string | undefined;
  try {
    const [row] = await db
      .select({ fetchedAt: schema.marketDailySnapshots.fetchedAt })
      .from(schema.marketDailySnapshots)
      .orderBy(desc(schema.marketDailySnapshots.id))
      .limit(1);
    lastUpdated = row?.fetchedAt ?? undefined;
  } catch {
    // non-fatal — footer will show "—" gracefully
  }
  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--bg)", color: "var(--text-primary)" }}>
      {/* Header */}
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
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Methodology &amp; Data Sources</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Where every number comes from, how derived metrics are calculated, and what the known limitations are.
          </p>
        </div>

        {/* Table of contents */}
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
              {DATA_SOURCES.map((row, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                  }}
                >
                  <td className="px-3 py-2 font-medium whitespace-nowrap" style={{ color: "var(--text-primary)" }}>
                    {row.metric}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                    {row.source}
                  </td>
                  <td className="px-3 py-2 mono whitespace-nowrap" style={{ color: "var(--nifty-orange)" }}>
                    {row.ticker}
                  </td>
                  <td className="px-3 py-2" style={{ color: "var(--text-secondary)" }}>
                    {row.method}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>
                    {row.frequency}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                    {row.lag}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div
          className="rounded-lg p-4 text-xs mb-8"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
        >
          <strong style={{ color: "var(--amber-accent)" }}>Note on MSCI proxies:</strong>{" "}
          MSCI India and MSCI EM PE are proxied via ETF data (INDA, EEM), not sourced from MSCI&apos;s institutional data
          feed. Actual MSCI index PEs may differ slightly. ETF PEs are typically published by the fund provider
          (BlackRock for iShares) and updated daily.
        </div>

        {/* ── Section 2: Calculation Methodology ── */}
        <SectionAnchor id="calculations">2. Calculation Methodology — How Derived Metrics Are Computed</SectionAnchor>

        <SubHeading>PE Standalone Equivalent (post-April 2021)</SubHeading>
        <FormulaBlock>{`Formula:  Published Consolidated PE × 1.175

Example:  Mar-26 published PE = 19.6x
          Standalone Equiv = 19.6 × 1.175 = 23.0x

Why:      In April 2021, NSE switched PE calculation from standalone to consolidated
          earnings. Consolidated earnings are ~15–20% higher (they include subsidiary
          profits), so the published PE dropped ~15–20% overnight with no change in
          prices. The 1.175 factor (midpoint of 15–20%) adjusts post-2021 PEs upward
          to approximate standalone equivalents, enabling a consistent 26-year series.

Constant: PE_ADJUSTMENT_FACTOR = 1.175
          Note: The actual gap varies by year and index. This is a fixed estimate.
          Consider updating annually based on standalone vs consolidated EPS comparison.`}
        </FormulaBlock>

        <SubHeading>Nifty EPS (TTM)</SubHeading>
        <FormulaBlock>{`Formula:  Nifty 50 Level ÷ Nifty 50 PE (TTM)

Example:  Mar-26: Level = 22,331, PE = 19.6x
          EPS = 22,331 ÷ 19.6 = ₹1,139

Note:     This is a derived approximation. NSE does not publish a standalone EPS
          figure directly. The published PE uses consolidated earnings; dividing by
          the published PE gives consolidated-basis EPS.`}
        </FormulaBlock>

        <SubHeading>EPS Growth YoY</SubHeading>
        <FormulaBlock>{`Formula:  (Current EPS − Previous Year EPS) ÷ Previous Year EPS × 100

Example:  Mar-26 EPS = ₹1,139, Mar-25 EPS = ₹1,098
          Growth = (1,139 − 1,098) ÷ 1,098 × 100 = +3.7%`}
        </FormulaBlock>

        <SubHeading>EPS 3-Year CAGR</SubHeading>
        <FormulaBlock>{`Formula:  ((Current EPS ÷ EPS 3 Years Ago) ^ (1/3) − 1) × 100

Example:  Mar-26 EPS = ₹1,139, Mar-23 EPS = ₹800
          CAGR = (1,139 ÷ 800)^(0.333) − 1 = +12.5%`}
        </FormulaBlock>

        <SubHeading>Earnings Yield (Trailing)</SubHeading>
        <FormulaBlock>{`Formula:  (1 ÷ Trailing PE) × 100

Example:  PE = 19.6x → Earnings Yield = 1 ÷ 19.6 × 100 = 5.1%

Interpretation: For every ₹100 of market value, companies earn ₹5.10 annually.`}
        </FormulaBlock>

        <SubHeading>Earnings Yield (Forward)</SubHeading>
        <FormulaBlock>{`Formula:  (1 ÷ Forward PE) × 100

Example:  Forward PE = 17x → Forward Earnings Yield = 5.9%`}
        </FormulaBlock>

        <SubHeading>Equity Risk Premium (Trailing)</SubHeading>
        <FormulaBlock>{`Formula:  Trailing Earnings Yield − India 10-Year Government Bond Yield

Example:  Earnings Yield = 5.1%, Bond Yield = 6.9%
          Trailing ERP = 5.1% − 6.9% = −1.8%

Interpretation: Negative ERP means bonds currently offer a higher yield than equity
earnings. Equities must deliver capital appreciation (via earnings growth or PE
expansion) to justify the risk premium over bonds.`}
        </FormulaBlock>

        <SubHeading>Equity Risk Premium (Forward)</SubHeading>
        <FormulaBlock>{`Formula:  (1 ÷ Forward PE) × 100 − India 10-Year Bond Yield

Example:  Forward PE = 17x → Forward EY = 5.9%
          Bond Yield = 6.9%
          Forward ERP = 5.9% − 6.9% = −1.0%

Note:     Forward ERP uses consensus expected earnings. More relevant for
          forward-looking allocation decisions since equities offer growth
          optionality that bonds don't.`}
        </FormulaBlock>

        <SubHeading>India vs EM Premium</SubHeading>
        <FormulaBlock>{`Formula:  (MSCI India PE ÷ MSCI EM PE − 1) × 100

Example:  MSCI India PE = 21x, MSCI EM PE = 17x
          Premium = (21 ÷ 17 − 1) × 100 = +24%

Historical average: ~35%. Current 24% indicates premium is below its average —
constructive for FII inflows as India becomes relatively cheaper vs EM peers.`}
        </FormulaBlock>

        <SubHeading>Premium / (Discount) to Median</SubHeading>
        <FormulaBlock>{`Formula:  (Current Metric − Long-term Median) ÷ Long-term Median × 100

Example:  PE Standalone Equiv = 23.0x, Median = 22.0x
          Premium = (23.0 − 22.0) ÷ 22.0 × 100 = +4.5%

Convention: Positive = premium (typically shown in red — expensive vs history)
            Negative = discount (shown in green — cheap vs history)`}
        </FormulaBlock>

        <SubHeading>Composite Score</SubHeading>
        <FormulaBlock>{`Formula:  (Sum of 10 signal scores) ÷ 10 × 10
Range:    0 (fully bearish) to 10 (fully bullish)

Each of 10 metrics is scored independently:
  1.0 point = bullish threshold met
  0.5 point = neutral zone
  0.0 points = bearish threshold met

Scoring thresholds:
  #  Metric                 Bullish (1)    Neutral (0.5)    Bearish (0)
  1  PE Standalone Equiv    < 22           22–24            > 24
  2  PB Ratio               < 3.0          3.0–3.4          > 3.4
  3  Dividend Yield         > 1.6%         1.3–1.6%         < 1.3%
  4  EPS Growth YoY         > 10%          0–10%            < 0%
  5  Forward PE             < 17           17–20            > 20
  6  India-EM Premium       < 30%          30–45%           > 45%
  7  Trailing ERP           > 1%           -0.5% to 1%      < -0.5%
  8  Net FII+DII Flow       > ₹20K Cr      ₹0–20K Cr        < ₹0 Cr
  9  SIP Growth YoY         > 10%          0–10%            < 0%
  10 Mcap/GDP               < 70%          70–95%           > 95%

Zones: 7+ = Strong Buy | 5.5–7 = Favorable | 4–5.5 = Neutral | 2.5–4 = Caution | <2.5 = Danger

R²: Pearson correlation coefficient squared between composite score and 1-year
    forward Nifty return, computed across all historical March-end observations
    with available forward returns. This is in-sample — scoring rules were
    designed with knowledge of historical outcomes. Not an out-of-sample backtest.`}
        </FormulaBlock>

        {/* ── Section 3: Long-term Medians ── */}
        <SectionAnchor id="medians">3. Long-term Medians — How They Were Determined</SectionAnchor>

        <Para>
          Long-term medians are used to contextualise current readings (e.g., is a PE of 22x cheap or expensive?).
          These medians are approximate — different start dates and methodologies produce different numbers.
        </Para>

        <div
          className="rounded-lg overflow-hidden mb-6"
          style={{ border: "1px solid var(--border)" }}
        >
          {[
            {
              metric: "Nifty 50 PE (standalone equiv)",
              value: "~22.0x",
              note:
                "Commonly cited across multiple sources: Trendonify (20-year median 21.97x), India Macro Indicators (18–22x avg), Bajaj AMC (10-year avg 24.79x). Rounded to 22.0x as consensus. A 10-year median is ~24x; a 20-year median is ~22x. Sensitive to start date.",
            },
            {
              metric: "Nifty 50 PB",
              value: "~3.4x",
              note:
                "Craytheon long-term range 2.0–5.0 (midpoint ~3.2), Trendlyne 5-year avg ~3.6. Used 3.4x as midpoint estimate.",
            },
            {
              metric: "Nifty 50 Dividend Yield",
              value: "~1.4%",
              note:
                "NSE historical data; Craytheon range 0.93%–2.0% (midpoint ~1.4%). Structural downward drift expected as buybacks replace dividends.",
            },
            {
              metric: "Midcap 100 PE",
              value: "~26.5x",
              note:
                "Estimated from available historical data points. Less reliable than Nifty 50 median — midcap PE history is shorter (index launched 2004).",
            },
            {
              metric: "Smallcap 100 PE",
              value: "~24.5x",
              note:
                "Estimated. Angel One cited 5-year avg ~28x, 2-year avg ~26.7x. 24.5x is a conservative long-run estimate.",
            },
          ].map((row, i) => (
            <div
              key={i}
              className="px-4 py-3"
              style={{
                borderBottom: i < 4 ? "1px solid var(--border)" : undefined,
                background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
              }}
            >
              <div className="flex flex-wrap items-baseline gap-3 mb-1">
                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {row.metric}
                </span>
                <span className="mono text-sm font-bold" style={{ color: "var(--cyan)" }}>
                  {row.value}
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {row.note}
              </p>
            </div>
          ))}
        </div>

        <Para>
          These medians were not computed from raw daily NSE data with a defined start date. They are consensus
          estimates from published analyses. Expect ±1–2 turns of uncertainty on any given median.
        </Para>

        {/* ── Section 4: Known Limitations ── */}
        <SectionAnchor id="limitations">4. Known Limitations</SectionAnchor>

        <Para>
          This dashboard is an educational and analytical tool. The following limitations apply to all data shown.
        </Para>

        <ol className="space-y-3 mb-8">
          {LIMITATIONS.map((text, i) => (
            <li key={i} className="flex gap-3">
              <span
                className="mono text-xs font-bold shrink-0 mt-0.5 w-5 text-right"
                style={{ color: "var(--text-muted)" }}
              >
                {i + 1}.
              </span>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {text}
              </p>
            </li>
          ))}
        </ol>

        {/* ── Section 5: Changelog ── */}
        <SectionAnchor id="changelog">5. Methodology Changelog</SectionAnchor>

        <Para>
          Changes to methodology, data sources, or scoring rules are tracked here.
        </Para>

        <div
          className="rounded-lg overflow-hidden mb-8"
          style={{ border: "1px solid var(--border)" }}
        >
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                {["Date", "Version", "Change", "Rationale"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                {
                  date: "Apr 2026",
                  version: "v4",
                  change: "Initial dynamic deployment",
                  rationale:
                    "Next.js + Turso + Vercel Cron. 10 metrics, composite scoring, 27-year seed data.",
                },
                {
                  date: "Apr 2021",
                  version: "—",
                  change: "NSE switched PE from standalone to consolidated",
                  rationale:
                    "Post-2021 PE values adjusted ×1.175 to restore series consistency.",
                },
                {
                  date: "—",
                  version: "—",
                  change: "Future changes logged here",
                  rationale: "—",
                },
              ].map((row, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: i < 2 ? "1px solid var(--border)" : undefined,
                  }}
                >
                  <td className="px-3 py-2 mono whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>{row.date}</td>
                  <td className="px-3 py-2 mono" style={{ color: "var(--cyan)" }}>{row.version}</td>
                  <td className="px-3 py-2" style={{ color: "var(--text-primary)" }}>{row.change}</td>
                  <td className="px-3 py-2" style={{ color: "var(--text-muted)" }}>{row.rationale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Back link */}
        <div className="flex justify-center pt-4 pb-2">
          <Link
            href="/"
            className="text-sm px-4 py-2 rounded-lg transition-colors"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--cyan)",
            }}
          >
            ← Back to Dashboard
          </Link>
        </div>
      </main>

      <Footer lastUpdated={lastUpdated} />
    </div>
  );
}
