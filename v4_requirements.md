# Indian Market Valuation Dashboard v4 — Product Requirements

## Overview

A live, self-updating web dashboard that tracks 10 Indian equity market valuation and flow metrics across Nifty 50, Midcap 100, and Smallcap 100 — with historical context from 2000 onward, a composite scoring framework, and plain-English metric explanations.

**v3 was a static HTML artifact with hardcoded data. v4 makes it dynamic — auto-fetching data, updating daily, and deployable as a standalone web app.**

### Why This Exists

There's a gap in Indian retail investing tools. Trendlyne/Screener show individual metrics without synthesis. Institutional tools (Bloomberg, FactSet) are behind paywalls. Fintwit makes confident claims from one metric. This dashboard sits in the middle — 10 metrics, one synthesised view, with methodology transparency.

### Target User

Self-directed Indian investor with financial literacy (understands PE, PB, earnings yield). Invests via SIPs and occasional lump-sum. Wants a structured, honest framework to assess market positioning. Not a day trader. Not a complete beginner.

---

## Architecture

### Infrastructure Context

You already run two services for the ReadRabbit article recommendation project:
- **Vercel** — Next.js frontend
- **Render** — FastAPI backend + PostgreSQL with pgvector

This dashboard does NOT need Render. The entire data pipeline is ~10 HTTP GETs + arithmetic — no Python, no embeddings, no heavy processing. Everything runs as Vercel serverless functions + Vercel Cron. The database is Turso (managed libSQL/SQLite on the edge), which has a generous free tier (500 DBs, 9GB storage, 500M reads/month). This keeps the two projects fully decoupled — no shared database, no shared deployment pipeline, no risk of one breaking the other.

### Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | Next.js (App Router) + Tailwind CSS | SSR for SEO, Tailwind for rapid dark-mode UI. Same framework as ReadRabbit — familiar tooling. |
| Charts | Recharts or Lightweight Charts | Simple, React-native, no heavy deps |
| Data fetching | Vercel Cron + API routes (serverless functions) | No separate backend needed. Cron triggers fetch, API route writes to Turso. |
| Database | Turso (libSQL) via Drizzle ORM | Edge-native SQLite. Free tier is 100× what this project needs. No Render/Postgres required. |
| Hosting | Vercel (new project, same account as ReadRabbit) | Free tier supports multiple projects independently. |
| Data sources | NSE India, Yahoo Finance API, AMFI, RBI | See Data Sources section |

### Why Not Reuse ReadRabbit's Postgres on Render?

Considered and rejected. The data volume here is trivial (~27 historical rows + 1 row/day). Coupling to ReadRabbit's Postgres would mean: (a) shared failure domain — a Render outage takes down both projects, (b) schema coordination across two unrelated codebases, (c) paying for Render compute just to run what a Vercel serverless function handles in 2 seconds. Turso is the right tool for a read-heavy, tiny-data, edge-deployed dashboard.

### Project Structure (gstack-compatible)

```
project/
├── .gstack/
│   └── skills/
│       ├── data-engineer/        # Fetching, parsing, storing market data
│       │   └── SKILL.md
│       ├── frontend-dev/          # React components, Tailwind styling
│       │   └── SKILL.md
│       ├── analyst/               # Scoring logic, metric calculations
│       │   └── SKILL.md
│       └── qa/                    # Data validation, edge cases
│           └── SKILL.md
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main dashboard
│   │   ├── methodology/
│   │   │   └── page.tsx          # Methodology & Data Sources page (F8)
│   │   ├── layout.tsx            # Dark theme shell + global footer
│   │   └── api/
│   │       ├── refresh/route.ts  # Manual data refresh endpoint
│   │       └── data/route.ts     # JSON API for all metrics
│   ├── components/
│   │   ├── Overview.tsx          # Verdict cards + summary table
│   │   ├── MetricPanel.tsx       # Reusable panel with info card + table
│   │   ├── CompositeScore.tsx    # Score tab with R² stats
│   │   ├── DataTable.tsx         # Generic horizontal time-series table
│   │   ├── ViewToggle.tsx        # 5-year snapshot / full view switch
│   │   ├── TabNav.tsx            # Tab navigation
│   │   ├── Footer.tsx            # Attribution, methodology link, staleness indicator
│   │   └── StalenessIndicator.tsx # Last-updated timestamp with color coding
│   ├── lib/
│   │   ├── data-sources/
│   │   │   ├── nse.ts            # NSE India PE/PB/DY fetcher
│   │   │   ├── yahoo.ts          # Yahoo Finance price/index fetcher
│   │   │   ├── amfi.ts           # SIP flow data from AMFI
│   │   │   ├── rbi.ts            # Bond yield data
│   │   │   └── msci.ts           # MSCI India/EM PE (or proxy via ETF)
│   │   ├── calculations/
│   │   │   ├── pe-adjustment.ts  # Standalone equiv (×1.175 post-2021)
│   │   │   ├── erp.ts            # Equity risk premium (trailing + forward)
│   │   │   ├── composite.ts      # 10-metric scoring engine
│   │   │   └── r-squared.ts      # Correlation calculator
│   │   ├── db/
│   │   │   ├── schema.ts         # Drizzle schema
│   │   │   ├── seed.ts           # Historical data seed (2000–2025)
│   │   │   └── index.ts          # DB client
│   │   └── constants.ts          # Medians, thresholds, metric configs
│   ├── content/
│   │   ├── metric-explanations.ts # Static info card text for each tab
│   │   └── methodology.ts        # Structured content for /methodology page
│   └── types/
│       └── index.ts              # TypeScript types for all data
├── scripts/
│   ├── fetch-daily.ts            # Cron job: fetch today's data
│   ├── fetch-monthly.ts          # Cron job: fetch SIP/flow data (monthly lag)
│   └── seed-historical.ts        # One-time: populate 2000–2025 data
├── data/
│   └── historical-seed.json      # Hardcoded historical data for seeding
├── .env.example                  # NEXT_PUBLIC_GITHUB_URL, NEXT_PUBLIC_LINKEDIN_URL, etc.
├── drizzle.config.ts
├── package.json
└── README.md
```

---

## Data Sources

### Daily-Updated Metrics

| Metric | Source | Method | Frequency |
|--------|--------|--------|-----------|
| Nifty 50 closing price | Yahoo Finance (`^NSEI`) | REST API | Daily |
| Nifty 50 PE (TTM, consolidated) | NSE India (niftyindices.com) | Scrape PE/PB/DY report page | Daily |
| Nifty 50 PB ratio | NSE India | Same as above | Daily |
| Nifty 50 Dividend Yield | NSE India | Same as above | Daily |
| Nifty Midcap 100 PE | NSE India | Same source, different index | Daily |
| Nifty Smallcap 100 PE | NSE India | Same source, different index | Daily |
| India 10Y bond yield | Trading Economics or RBI | REST API or scrape | Daily |
| MSCI India PE (proxy) | iShares MSCI India ETF (INDA) PE from Yahoo/Morningstar | API | Daily-ish |
| MSCI EM PE (proxy) | iShares MSCI EM ETF (EEM) PE from Yahoo/Morningstar | API | Daily-ish |

### Monthly-Updated Metrics

| Metric | Source | Method | Frequency |
|--------|--------|--------|-----------|
| FII/FPI net flows | NSDL (fpi.nsdl.co.in) or Trendlyne | Scrape monthly summary | Monthly |
| DII net flows | NSE India FII/DII report | Scrape | Monthly |
| SIP monthly inflows | AMFI (amfiindia.com) | Scrape monthly data release | Monthly (15-day lag) |

### Quarterly/Annually-Updated Metrics

| Metric | Source | Method | Frequency |
|--------|--------|--------|-----------|
| India Mcap/GDP | BSE total mcap (bseindia.com) ÷ RBI GDP data | Compute | Quarterly |
| Forward PE (consensus) | Screener.in or Trendlyne (aggregate) or manual update | Semi-manual | Quarterly |
| Nifty EPS (TTM) | Derived: Nifty level ÷ PE | Computed | Daily (derived) |

### Historical Seed Data

The `data/historical-seed.json` file contains all March-end values from 2000 to 2025 for every metric. This is the static dataset from our v3 build — 27 rows × 44 columns. Seeded once on initial setup. From that point forward, the app computes and stores new March-end snapshots automatically.

**Important:** Include the full CSV and markdown data files from v3 as the seed. The file `market_valuation_data.csv` is the canonical source.

---

## Core Features

### F1: Dashboard Overview (Default View)

**What:** 10 verdict cards showing current reading for each metric + a summary table that responds to view toggle.

**Verdict cards (fixed to latest data):**
- PE Standalone Equivalent (with published PE in subtext)
- PB Ratio
- Forward PE
- EPS Growth YoY
- India vs EM Premium
- Forward ERP
- Mcap/GDP
- SIP Monthly
- FII Net Flow (current FY)
- Composite Score

Each card shows: metric name, current value, signal badge (Attractive/Fair/Stretched/etc with green/amber/red coloring), one-line context.

**Summary table (responds to view toggle):**
All 13 key rows across selected time periods. Same data as individual tabs but condensed into one scannable table.

**"Last updated" timestamp** prominently displayed — critical for trust. Format: "Data as of {date}. PE/PB/DY updated daily. SIP/flows updated monthly."

### F2: Individual Metric Tabs

**11 tabs total:** Overview, PE Ratio, PB Ratio, Dividend Yield, EPS Growth, Forward PE, India vs EM, Equity Risk Premium, FII/DII & SIP, Mcap/GDP, Composite Score.

**Each tab contains:**

1. **Info card** — What is this metric, why it's useful, what gotcha to watch for. Written in plain English. 2–3 short paragraphs max. This is static content, doesn't change with data updates. Each info card ends with a link: "How is this calculated? → Methodology & Sources" pointing to `/methodology`.

2. **Data table** — Horizontal time-series table with years as columns, metrics as rows. Color-coded cells (green = attractive, red = stretched, amber = neutral). Sticky first column for metric labels. Sticky header row for year labels.

3. **For PE tab specifically:** Three sub-sections (Nifty 50, Midcap 100, Smallcap 100) each with Published PE, Standalone Equivalent PE, Median, Premium/Discount rows.

4. **For ERP tab specifically:** Both trailing and forward ERP rows, plus a "Net Signal" synthesis row.

5. **For Composite tab specifically:** R² stats box at top (R², r, n observations, current score), score row, zone row, 1Y forward return row.

### F3: View Toggle (5-Year Snapshot vs Full History)

**5-Year Snapshot (default):** Shows 6 columns — Mar-05, Mar-10, Mar-15, Mar-20, Mar-25, and latest available. Captures every major market regime without horizontal scrolling. Ideal for mobile.

**Full History:** All years from Mar-00 to latest. Horizontal scroll enabled. Power user mode.

Toggle persists across tab switches within a session. Default to snapshot on first load.

### F4: PE Standalone Adjustment

Post-April-2021 consolidated PE values are adjusted by ×1.175 to approximate standalone equivalents. This factor is stored as a constant (`PE_ADJUSTMENT_FACTOR = 1.175`) and clearly marked in the UI with an orange ▲ indicator on adjusted cells and an orange column tint.

**Note in constants.ts:**
```
// The 15-20% gap between standalone and consolidated earnings was observed at the
// April 2021 transition. 1.175 is the midpoint. This factor may drift over time
// as subsidiary earnings grow. Consider updating annually based on aggregate
// standalone vs consolidated EPS comparison.
```

### F5: Composite Scoring Engine

**10 signals, each scored 1 / 0.5 / 0:**

| # | Metric | Bullish (1) | Neutral (0.5) | Bearish (0) |
|---|--------|-------------|---------------|-------------|
| 1 | PE Standalone Equiv | < 22 | 22–24 | > 24 |
| 2 | PB Ratio | < 3.0 | 3.0–3.4 | > 3.4 |
| 3 | Dividend Yield | > 1.6% | 1.3–1.6% | < 1.3% |
| 4 | EPS Growth YoY | > 10% | 0–10% | < 0% |
| 5 | Forward PE | < 17 | 17–20 | > 20 |
| 6 | India-EM Premium | < 30% | 30–45% | > 45% |
| 7 | Trailing ERP | > 1% | -0.5% to 1% | < -0.5% |
| 8 | Net FII+DII Flow | > ₹20K Cr | ₹0–20K | < ₹0 |
| 9 | SIP Growth YoY | > 10% | 0–10% | < 0% |
| 10 | Mcap/GDP | < 70% | 70–95% | > 95% |

**Score = (sum of points / 10) × 10. Range: 0 to 10.**

**Zones:** 7+ = Strong Buy, 5.5–7 = Favorable, 4–5.5 = Neutral, 2.5–4 = Caution, < 2.5 = Danger.

**R² calculation:** Pearson correlation between composite score and 1-year forward Nifty return across all historical March-end observations with available forward returns. Displayed in the Composite tab with explicit caveat: "In-sample, not a backtest."

### F6: Auto-Refresh Data Pipeline

**Daily job (via Vercel Cron or external scheduler):**
1. Fetch Nifty 50/Midcap/Smallcap closing prices
2. Fetch PE, PB, Dividend Yield from NSE
3. Fetch India 10Y bond yield
4. Compute derived metrics (EPS = Level/PE, Earnings Yield = 1/PE, Trailing ERP = EY - Bond Yield)
5. Store as daily snapshot in Turso

**Monthly job (manually triggered or scheduled for 16th of each month):**
1. Fetch FII/DII monthly net from NSDL/NSE
2. Fetch SIP monthly data from AMFI (usually released with 15-day lag)
3. Store in monthly aggregates table

**Quarterly job (manual trigger):**
1. Update Mcap/GDP from BSE + RBI data
2. Update forward PE consensus (manual input or scraped)

**March-end annual snapshot:**
1. At the close of each March, automatically compute and store the annual row that appears in the historical tables
2. Compute composite score for the new March-end
3. Backfill 1Y forward return for the March-end from 12 months ago (if March has passed)

### F7: Staleness Indicator

Every page shows: **"Last updated: {timestamp}"** with color coding:
- Green: Updated within 24 hours (trading day)
- Amber: 2–5 days old
- Red: > 5 days old, with message "Data may be stale — check source status"

If a data source fails, the dashboard should display the last known good value with a ⚠️ indicator rather than showing blanks or errors.

### F8: Methodology & Data Sources Page (Accessible from every tab)

**This is critical for credibility.** The dashboard must make it dead simple for anyone to understand exactly what data is shown, where it comes from, how every derived number is calculated, and what the known limitations are. This isn't a buried footnote — it's a first-class page linked from the main navigation and from the footer on every tab.

**Page URL:** `/methodology`

**Page structure:**

#### Section 1: Data Sources — Where Every Number Comes From

A table listing every metric, its exact source URL, fetch method, update frequency, and any known lag.

| Metric | Source | URL | Method | Frequency | Lag |
|--------|--------|-----|--------|-----------|-----|
| Nifty 50 Level | Yahoo Finance | finance.yahoo.com/quote/^NSEI | REST API (daily close) | Daily (6:30 PM IST) | Same day |
| Nifty 50 PE (TTM) | NSE India | niftyindices.com → Index Ratios | Scrape published PE/PB/DY | Daily | Same day |
| Nifty 50 PB | NSE India | Same as above | Same as above | Daily | Same day |
| Nifty 50 Dividend Yield | NSE India | Same as above | Same as above | Daily | Same day |
| Midcap 100 PE | NSE India | Same source, Midcap 100 index | Same as above | Daily | Same day |
| Smallcap 100 PE | NSE India | Same source, Smallcap 100 index | Same as above | Daily | Same day |
| India 10Y Bond Yield | Trading Economics / RBI | tradingeconomics.com/india/government-bond-yield | REST API or scrape | Daily | Same day |
| MSCI India PE (proxy) | iShares MSCI India ETF (INDA) | Via Yahoo Finance or Morningstar | API | Daily-ish | 1–2 days |
| MSCI EM PE (proxy) | iShares MSCI EM ETF (EEM) | Via Yahoo Finance or Morningstar | API | Daily-ish | 1–2 days |
| FII/FPI Net Flows | NSDL | fpi.nsdl.co.in/Reports/Yearwise.aspx | Scrape monthly summary | Monthly | 5–10 days |
| DII Net Flows | NSE India | nseindia.com/reports/fii-dii | Scrape | Monthly | 5–10 days |
| SIP Monthly Inflows | AMFI | amfiindia.com/research-information/amfi-monthly | Scrape monthly release | Monthly | 15-day lag |
| India Mcap/GDP | BSE (total mcap) ÷ RBI (nominal GDP) | bseindia.com + rbi.org.in | Computed | Quarterly | 1–2 months |
| Forward PE (consensus) | Screener.in, Trendlyne, or broker research | Manual update or scraped | Quarterly | Variable |
| Nifty EPS (TTM) | Derived | Nifty Level ÷ Published PE | Computed daily | Daily | Derived |

**Note displayed on page:** "MSCI India and MSCI EM PE are proxied via ETF data (INDA, EEM), not sourced from MSCI's institutional data feed. Actual MSCI index PEs may differ slightly."

#### Section 2: Calculation Methodology — How Every Derived Metric Is Computed

Each derived metric gets its own subsection with the exact formula and worked example.

**PE Standalone Equivalent (post-April 2021)**
```
Formula: Published Consolidated PE × 1.175
Example: Mar-26 published PE = 19.6x → Standalone Equiv = 19.6 × 1.175 = 23.0x
Why: In April 2021, NSE switched PE calculation from standalone to consolidated earnings.
Consolidated earnings are ~15–20% higher (they include subsidiary profits), so the published
PE dropped overnight by ~15–20% with no change in market prices. The 1.175 factor (midpoint
of 15–20%) adjusts post-2021 PEs upward to approximate what they would have been under the
old standalone methodology, enabling consistent comparison across the full 26-year series.
Limitation: The actual gap varies by year and index composition. 1.175 is a fixed estimate.
```

**Nifty EPS (TTM)**
```
Formula: Nifty 50 Level ÷ Nifty 50 PE (TTM)
Example: Mar-26 Level = 22,331, PE = 19.6x → EPS = 22,331 ÷ 19.6 = ₹1,139
Note: This is a derived approximation, not NSE's published EPS figure.
```

**EPS Growth YoY**
```
Formula: (Current Year EPS − Previous Year EPS) ÷ Previous Year EPS × 100
Example: Mar-26 EPS = ₹1,139, Mar-25 EPS = ₹1,098 → Growth = (1139−1098)/1098 × 100 = +3.7%
```

**EPS 3-Year CAGR**
```
Formula: (Current EPS / EPS 3 years ago)^(1/3) − 1) × 100
Example: Mar-26 EPS = ₹1,139, Mar-23 EPS = ₹800 → CAGR = (1139/800)^0.333 − 1 = +12.5%
```

**Earnings Yield**
```
Formula: (1 ÷ PE) × 100
Example: PE = 19.6x → Earnings Yield = 1/19.6 × 100 = 5.1%
Interpretation: For every ₹100 of market value, companies earn ₹5.10 annually.
```

**Equity Risk Premium (Trailing)**
```
Formula: Trailing Earnings Yield − India 10-Year Government Bond Yield
Example: Earnings Yield = 5.1%, Bond Yield = 6.9% → ERP = 5.1% − 6.9% = −1.8%
Interpretation: Negative ERP means bonds currently offer a higher yield than equity
earnings. Equities must deliver capital appreciation (via earnings growth or PE expansion)
to justify the risk premium.
```

**Equity Risk Premium (Forward)**
```
Formula: (1 ÷ Forward PE) × 100 − India 10-Year Bond Yield
Example: Forward PE = 17x → Forward EY = 5.9%, Bond = 6.9% → Forward ERP = −1.0%
Note: Forward ERP uses consensus expected earnings. More relevant for forward-looking
allocation decisions since equities offer growth optionality that bonds don't.
```

**India vs EM Premium**
```
Formula: (MSCI India PE ÷ MSCI EM PE − 1) × 100
Example: MSCI India PE = 21x, MSCI EM PE = 17x → Premium = (21/17 − 1) × 100 = 24%
Historical average: ~35%. Current 24% indicates premium is below average.
```

**Premium / (Discount) to Median**
```
Formula: (Current Metric − Long-term Median) ÷ Long-term Median × 100
Example: PE Standalone Equiv = 23.0x, Median = 22.0x → Premium = (23−22)/22 × 100 = +4.5%
Convention: Positive = premium (shown in red), Negative = discount (shown in green, in parentheses).
```

**Composite Score**
```
Formula: Sum of 10 signal scores (each 0, 0.5, or 1) ÷ 10 × 10
Range: 0 to 10
Each metric is scored independently:
  1 point = bullish threshold met
  0.5 points = neutral zone
  0 points = bearish threshold met
See Composite Scoring Engine section for exact thresholds.
R²: Pearson correlation coefficient squared between composite score and 1-year
forward Nifty return, computed across all historical March-end observations.
This is in-sample — designed with knowledge of outcomes. Not an out-of-sample backtest.
```

#### Section 3: Long-term Medians — How They Were Determined

```
Nifty 50 PE (standalone): ~22.0x
  Source: Commonly cited across Trendonify (20-year median 21.97x), India Macro Indicators
  (average 18-22x), Bajaj AMC (10-year average 24.79x). Rounded to 22.0x as consensus figure.
  Note: Sensitive to start date. A 10-year median is ~24x; a 20-year median is ~22x.

Nifty 50 PB: ~3.4x
  Source: Craytheon (long-term range 2.0–5.0, midpoint ~3.2), Trendlyne (5-year average ~3.6).
  
Nifty 50 Dividend Yield: ~1.4%
  Source: NSE historical data, Craytheon (range 0.93%–2.0%, midpoint ~1.4%).
  
Midcap 100 PE: ~26.5x
  Source: Estimated from available historical data points. Less reliable than Nifty 50 median.
  
Smallcap 100 PE: ~24.5x
  Source: Estimated. Angel One cited 5-year average ~28x, 2-year average ~26.7x.
  
These are approximate. They were not computed from raw daily data with a defined start date.
Different start dates and methodologies produce different medians (±1–2 turns).
```

#### Section 4: Known Limitations

1. **Data is approximate.** Compiled from public sources, not primary NSE daily data downloads. Individual values may be off by small amounts.
2. **PE standalone adjustment (×1.175) is a fixed estimate.** The actual standalone-to-consolidated gap varies by year and index. Factor may understate the gap in later years as subsidiary earnings grow.
3. **Long-term medians are approximate.** See Section 3 above for derivation. Not computed from raw daily data.
4. **Composite score is not backtested.** In-sample correlation shown. Scoring rules were designed with knowledge of historical outcomes. Not validated out-of-sample.
5. **No sector composition adjustment.** Nifty 50's sectoral mix changes over time (tech-heavy in 2000, financials-heavy in 2026), affecting what a "fair" PE should be.
6. **Forward PE relies on consensus estimates** which have a documented 5–15% optimism bias.
7. **MSCI India/EM PE are proxied** via ETF or secondary sources, not from MSCI's institutional data feed.
8. **Historical data before 2005** is sparser for Midcap and Smallcap indices (launched 2004–05) and for FII/DII flows.
9. **SIP data available from FY17 onward only.** Earlier years default to neutral (0.5) in composite score.
10. **This is not investment advice.** The dashboard is an educational and analytical tool. Investment decisions should be based on your own research and risk assessment.

#### Section 5: Methodology Changelog

Track any changes to methodology, data sources, or scoring rules over time.

| Date | Change | Rationale |
|------|--------|-----------|
| Apr 2026 | v4 launch | Initial dynamic deployment with 10 metrics, composite scoring |
| — | — | Future changes logged here |

**Link to this page:** Every tab's footer includes "How is this calculated? → Methodology & Sources". The main footer also links to it.

### F9: Footer Attribution & Links

**Every page footer must include:**

```
Made by Jayesh Bali · LinkedIn · GitHub (placeholder until repo is public)
Methodology & Sources · Data as of {last_updated_date}
Not investment advice. For educational and analytical purposes only.
```

- "Jayesh Bali" links to https://www.linkedin.com/in/jayeshbali/
- "LinkedIn" also links to https://www.linkedin.com/in/jayeshbali/
- "GitHub" links to # (placeholder href) with a `data-github` attribute so it can be updated later without redeploying — or use an environment variable `NEXT_PUBLIC_GITHUB_URL` that defaults to "#"
- "Methodology & Sources" links to `/methodology`
- The timestamp is dynamic, pulled from the latest data fetch

**Store the GitHub URL as an env var:**
```
// .env
NEXT_PUBLIC_GITHUB_URL=#
NEXT_PUBLIC_LINKEDIN_URL=https://www.linkedin.com/in/jayeshbali/
NEXT_PUBLIC_AUTHOR_NAME=Jayesh Bali
```

---

## UI/UX Specifications

### Design Language

- **Dark theme only** (consistent with v3) — background #0c0f14, surfaces #13171e / #1a1f28
- **Fonts:** DM Sans (body), JetBrains Mono (numbers/data)
- **Color system:** Cyan (#22d3ee) for primary/Nifty 50, Purple (#a78bfa) for Midcap, Amber (#fbbf24) for Smallcap, Green (#34d399) for bullish, Red (#f87171) for bearish, Orange (#fb923c) for adjusted values
- **Signal badges:** Small pill-shaped labels (Attractive, Fair, Stretched, etc.) with colored backgrounds

### Mobile-First

- Default to 5-year snapshot view (no horizontal scroll needed)
- Tab navigation should wrap gracefully on narrow screens
- Verdict cards: 2-column grid on mobile, 5-column on desktop
- Tables: Sticky first column (metric names) always visible during horizontal scroll
- Info cards: Collapsible on mobile (tap to expand)

### Table Design

- Horizontal time-series: years as columns, metrics as rows
- Sticky header row (year labels) and sticky first column (metric labels)
- Color-coded cells using CSS classes: `.g` (green), `.r` (red), `.a` (amber), `.o` (orange)
- Post-2021 columns have subtle orange background tint (`.ce` class)
- Monospace font for all numeric values
- Row hover highlight

---

## Data Validation Rules

### On Fetch

- PE ratio must be between 5 and 60 (reject outliers)
- PB ratio must be between 1.0 and 8.0
- Dividend yield must be between 0.3% and 4.0%
- Bond yield must be between 3.0% and 14.0%
- If any value falls outside bounds, log warning, skip update, retain last good value

### On Display

- If any metric is null/missing for the current period, show "—" with tooltip "Data unavailable"
- Forward PE: if consensus data is older than 90 days, show with ⚠️ and note "Estimate may be stale"
- Composite score: if > 2 of 10 inputs are missing, show score with caveat "Partial data — {n}/10 metrics available"

---

## Historical Data Seed

The file `data/historical-seed.json` should contain the exact data from our v3 CSV, structured as:

```typescript
interface AnnualSnapshot {
  year: string;                    // "Mar-00", "Mar-01", etc.
  niftyLevel: number;
  niftyPEPublished: number;
  niftyPEStandaloneEquiv: number;
  midcapPEPublished: number | null;
  midcapPEStandaloneEquiv: number | null;
  smallcapPEPublished: number | null;
  smallcapPEStandaloneEquiv: number | null;
  niftyPB: number;
  dividendYield: number;
  niftyEPS: number;
  epsGrowthYoY: number | null;
  forwardPE: number | null;
  msciIndiaPE: number | null;
  msciEmPE: number | null;
  indiaEmPremium: number | null;
  bond10Y: number;
  trailingERP: number;
  forwardERP: number | null;
  fiiNet: number | null;           // ₹ crores
  diiNet: number | null;
  sipMonthly: number | null;       // ₹ crores monthly average
  mcapGdp: number;                 // percentage
  compositeScore: number;
  forwardReturn1Y: number | null;  // percentage
}
```

---

## Metric Explanations (Static Content)

Each tab's info card content is static and stored in `src/content/metric-explanations.ts`. These texts were refined across v1–v3 iterations and should be used verbatim.

**Every info card must also include:**
- A "Source:" line at the bottom naming the exact data source (e.g., "Source: NSE India — niftyindices.com, updated daily")
- A link: "How is this calculated? → Methodology & Sources" pointing to `/methodology`

### PE Ratio
**What:** Rupees paid per ₹1 of trailing 12-month earnings. PE 22x = market values companies at 22× annual profits.
**Why useful:** Most intuitive valuation check. Buying above 22x standalone PE has historically delivered negative 3-year returns.
**Gotcha:** Low PE on peak earnings is a trap (2008). High PE on trough earnings may be fine (2020). Cross-check with EPS Growth tab.
**Source:** NSE India (niftyindices.com) — PE/PB/DY reports. Post-2021 values adjusted ×1.175 for standalone equivalence.

### PB Ratio
**What:** Market price ÷ book value (net assets). More stable than PE — book values don't swing wildly.
**Why useful:** Independent cross-check unaffected by the 2021 PE methodology switch. Consistent 26-year series.
**Zones:** Below 2.5 = strong buy. 2.75–3.25 = fair. Above 4.5 = expensive. All-time low: 2.17 (Mar-20).
**Source:** NSE India (niftyindices.com) — same report as PE.

### Dividend Yield
**What:** Annual dividends as % of market price. Moves inversely to exuberance — contrarian signal.
**Why useful:** Historically reliable at extremes. Above 1.8% = strong buy (2003, 2008, 2020). Below 1.0% = caution zone.
**Gotcha:** Structural downward drift as companies prefer buybacks over dividends (more tax-efficient).
**Source:** NSE India (niftyindices.com) — same report as PE.

### EPS Growth
**What:** Nifty 50 Earnings Per Share and growth rate. The "E" in P/E — what you're actually buying.
**Why useful:** PE 20x on 15% growth = attractive. PE 20x on flat earnings = vulnerable. The flat market in FY24–26 was absorbing strong earnings growth — a healthy "time correction."
**Watch:** Consensus FY27 expects ~14% recovery. Misses mean further correction.
**Source:** Derived — Nifty Level ÷ PE. Not NSE's published EPS.

### Forward PE
**What:** Current price ÷ expected EPS over next 12 months. What professional allocators actually use.
**Why useful:** Trailing PE is backward-looking. Forward PE prices in growth. Sub-18x historically = good entry zone.
**Gotcha:** Sell-side consensus has a 5–15% optimism bias. Realistic forward PE may be 1–2x higher than published.
**Source:** Screener.in, Trendlyne, or broker research. Updated quarterly. Marked stale if >90 days old.

### India vs EM
**What:** MSCI India PE ÷ MSCI EM PE = India's valuation premium. Drives FII allocation decisions.
**Why useful:** When India premium stretches to 60–80%, FIIs rotate to cheaper peers. When it compresses to 20–30%, India becomes relatively attractive.
**Current context:** Premium compressed significantly as China re-rated in 2025. Constructive for FII flows.
**Source:** Proxied via iShares MSCI India ETF (INDA) and iShares MSCI EM ETF (EEM) PE ratios. Not MSCI's institutional data.

### Equity Risk Premium
**What:** Earnings yield (1/PE) minus 10-year bond yield. Extra return equities offer over risk-free rate.
**Why useful:** When bonds yield more than equity earnings, stocks face a valuation headwind. Forward ERP uses consensus earnings — more relevant since equities offer growth optionality.
**Key insight:** A negative trailing ERP that's near-zero on forward basis = "equities need to earn their keep this year."
**Source:** Derived — Earnings yield from NSE PE, Bond yield from Trading Economics / RBI.

### FII/DII & SIP
**What:** Net institutional flows + monthly SIP run-rate. Supply-demand mechanics behind price action.
**Why useful:** SIP monthly inflows grew 8× since FY17, creating a structural floor. Annual SIP contribution now dwarfs FII net flows.
**Watch:** SIP stoppages exceeded new registrations in early 2025 for the first time. Most SIP flows go to mid/smallcap funds.
**Source:** FII/DII from NSDL (fpi.nsdl.co.in) and NSE. SIP from AMFI (amfiindia.com). Monthly, with 5–15 day lag.

### Mcap/GDP
**What:** Total BSE market cap ÷ India's GDP. Warren Buffett's "best single measure of where valuations stand."
**Why useful:** Macro-level check on whether equities outpace real economic output. India median ~80%.
**Caveats:** Structural upward bias — more listings, GDP under-measured, overseas earnings. Use 10-year rolling average rather than all-time median.
**Source:** BSE total market cap (bseindia.com) ÷ RBI nominal GDP. Updated quarterly.

### Composite Score
**What:** 10 metrics synthesised into 0–10 score. 1 point per bullish signal, 0.5 neutral, 0 bearish.
**Validation:** In-sample R² against 1Y forward returns computed and displayed. This is in-sample, not a backtest — treat as indicative pattern, not predictive model.
**Historical zones:** Score 7+ preceded the biggest rallies (Mar-03: +81%, Mar-09: +74%, Mar-20: +71%).
**Source:** Derived from all other metrics. Scoring rules documented in full at /methodology.

---

## Known Limitations

**All limitations are documented in full on the `/methodology` page (see F8 above).** The methodology page is the canonical source of truth for data provenance, calculation formulas, median derivations, and known gaps. Do not duplicate this information elsewhere — link to it.

---

## Deployment Checklist

- [ ] Set up Turso database and configure `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` env vars
- [ ] Seed historical data from `historical-seed.json`
- [ ] Verify daily fetch pipeline works for NSE PE/PB/DY
- [ ] Verify Yahoo Finance price fetch
- [ ] Verify bond yield fetch
- [ ] Set up Vercel Cron for daily refresh (6:30 PM IST, after market close)
- [ ] Set up monthly manual trigger for SIP/flow data
- [ ] Test 5-year snapshot and full view toggle
- [ ] Test all 11 tabs render correctly
- [ ] Test mobile responsiveness (iPhone SE, standard Android)
- [ ] Verify staleness indicator works (green/amber/red based on data age)
- [ ] Verify "Last updated" timestamp appears on every page
- [ ] Build `/methodology` page with all 5 sections (Sources, Calculations, Medians, Limitations, Changelog)
- [ ] Verify methodology page is linked from every tab footer and main footer
- [ ] Verify footer shows: Made by Jayesh Bali · LinkedIn · GitHub · Methodology · Timestamp · Disclaimer
- [ ] Set `NEXT_PUBLIC_GITHUB_URL` to "#" initially; update once repo is public
- [ ] Set `NEXT_PUBLIC_LINKEDIN_URL` to https://www.linkedin.com/in/jayeshbali/
- [ ] Add basic OG meta tags for social sharing (title, description, dark theme preview image)
- [ ] Deploy to Vercel as new project (separate from ReadRabbit), test production build

---

## Future Considerations (Not in v4 Scope)

These were identified in v3 GAN analysis but deferred:

- **Sector composition adjustment** for PE over time
- **Currency (INR/USD) overlay** for FII return context
- **Tail risk / max drawdown analysis** alongside forward returns
- **Bear case scenario tab** ("what if oil hits $120, rupee crosses 95")
- **Portfolio-level personalization** ("my portfolio is 60% midcap — what does this mean for me")
- **Email/push alerts** when composite score crosses a threshold
- **Backtest engine** for composite score with train/test split
