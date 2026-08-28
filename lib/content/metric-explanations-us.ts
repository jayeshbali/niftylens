import type { MetricExplanation } from "./metric-explanations";

export const metricExplanationsUS: Record<string, MetricExplanation> = {
  overview: {
    title: "NiftyLens — US Market Valuation Dashboard",
    what: "The S&P 500 valuation framework, built entirely from metrics with a genuine free live data feed — no manual entry, no forced parity with India's exact metric set — plus a bonus Risk & Sentiment tab with metrics the US market's data landscape supports that India's didn't.",
    whyUseful:
      "Switch between Snapshot and Full History (1871–present, the full Shiller dataset horizon) using the toggle above. Each tab explains what it measures, why it matters, and the specific gotcha to watch for.",
    source: "Aggregated from multpl.com (Shiller dataset), FRED (Federal Reserve), World Bank, Yahoo Finance.",
    gotcha: "No single metric tells the full story. When multiple signals agree, conviction increases. When they disagree, the dashboard helps you understand why.",
  },

  pe: {
    title: "PE Ratio",
    what: "Dollars paid per $1 of trailing 12-month “as reported” earnings. PE 20x = market values companies at 20× annual profits.",
    whyUseful:
      "The most intuitive valuation check. Unlike India, the US has no 2021-style methodology break — this is one continuous series back to 1871.",
    gotcha:
      "Low PE on peak earnings is a trap (2007). High PE on trough earnings may be fine (2009, 2020). Cross-check with the EPS Growth tab and the Shiller CAPE (Risk & Sentiment tab), which smooths this exact distortion using 10-year average earnings.",
    source: "multpl.com (S&P 500 PE Ratio), sourced from Robert Shiller's public dataset. Updated live.",
  },

  pb: {
    title: "PB Ratio",
    what: "Market price ÷ book value (net assets). Historically more stable than PE, though buybacks and intangible-heavy balance sheets have pushed the modern regime well above historical norms.",
    whyUseful:
      "Independent cross-check on valuation. The long-run (1871–present) median is much lower than today's typical reading — a genuine structural shift, not a data error.",
    zones: "Long-run median ~2.7x (series only available from ~1978). Modern-regime readings of 4–5x+ are common and don't carry the same signal they once did.",
    source: "multpl.com (S&P 500 Price to Book Value). Updated live.",
  },

  dy: {
    title: "Dividend Yield",
    what: "Annual dividends as % of market price. Moves inversely to exuberance — a contrarian signal.",
    whyUseful:
      "Historically reliable at extremes over the full 1871–present series. But payout preferences have shifted structurally toward buybacks since the 1980s/90s — a modern yield of ~1.3–2% is not comparable to a 4%+ yield from 1950.",
    gotcha:
      "Structural downward drift as companies prefer buybacks over dividends (more tax-efficient, same story as India, but further along in the US).",
    source: "multpl.com (S&P 500 Dividend Yield). Updated live.",
  },

  eps: {
    title: "EPS Growth",
    what: "S&P 500 aggregate earnings and growth rate. The “E” in P/E — what you're actually buying.",
    whyUseful:
      "PE 20x on 15% growth is attractive; PE 20x on flat earnings is vulnerable. Same logic as India's EPS Growth tab.",
    watch: "Watch for margin-cycle turns — US corporate margins are near multi-decade highs, a tailwind that can reverse.",
    source: "multpl.com (S&P 500 Earnings) — Shiller's “as reported” aggregate earnings series.",
  },

  usVsExUs: {
    title: "US vs Ex-US",
    what: "SPY PE ÷ ACWX (all-country ex-US) PE = the US valuation premium over the rest of the world's developed and emerging markets combined.",
    whyUseful:
      "The mirror image of India's “India vs EM” tab. A stretched premium has historically preceded periods of international outperformance; a compressed premium has favored staying US-heavy.",
    gotcha:
      "This is an ETF-PE proxy (SPY/ACWX), not sourced from MSCI's institutional index data — same caveat as India's INDA/EEM proxy. Only available from the 2000s onward, when these ETFs launched.",
    source: "Proxied via SPDR S&P 500 ETF (SPY) and iShares MSCI ACWI ex-US ETF (ACWX) PE ratios, via Yahoo Finance.",
  },

  erp: {
    title: "Equity Risk Premium",
    what: "Earnings yield (1/PE) minus the 10-year Treasury yield. The extra return equities offer over the risk-free rate.",
    whyUseful:
      "When Treasuries yield more than equity earnings, stocks face a valuation headwind.",
    gotcha:
      "The US 10-year Treasury yield (FRED DGS10) is an official, clean data series — a meaningfully more reliable risk-free rate than India's proxied bond yield. Consider also the real (TIPS) yield in the Risk & Sentiment tab for a fuller picture.",
    source: "Derived — Earnings yield from multpl.com PE, Treasury yield from FRED (DGS10).",
  },

  mcapGdp: {
    title: "Mcap/GDP",
    what: "Total US market capitalization ÷ GDP — Warren Buffett's “best single measure of where valuations stand,” and the ratio he was originally describing.",
    whyUseful:
      "Macro-level check on whether equities have outpaced real economic output. Sourced directly from the World Bank's official ratio (no reconstruction needed).",
    gotcha:
      "FRED discontinued its Wilshire 5000 index series in June 2024, which is how most trackers used to reconstruct this ratio. This dashboard instead uses the World Bank's pre-computed ratio (annual, several months' lag). The ratio has also drifted structurally higher over the past two decades — the original 70–80% “fair value” framework predates that shift, so treat the zone bands as directional, not absolute.",
    source: "World Bank Open Data (CM.MKT.LCAP.GD.ZS: market capitalization of listed domestic companies, % of GDP). Annual.",
  },

  riskSentiment: {
    title: "Risk & Sentiment",
    what: "Bonus metrics with no direct India equivalent, made possible by the depth of free US public data: Shiller CAPE, VIX, high-yield credit spreads, the 10Y–2Y yield curve, and real (TIPS) yields — all fully automated, no manual entry.",
    whyUseful:
      "These add texture that trailing PE alone misses: CAPE smooths the earnings cycle, VIX and credit spreads gauge market stress, and the yield curve is a well-studied recession signal.",
    gotcha:
      "Informational only — none of these feed into the Composite Score.",
    source: "multpl.com (CAPE), Yahoo Finance (VIX), FRED (credit spread, yield curve, real yield).",
  },

  composite: {
    title: "Composite Score",
    what: "7 metrics synthesised into a 0–10 score — every one of them a genuinely automated, free-data-fed signal. 1 point per bullish signal, 0.5 neutral, 0 bearish.",
    whyUseful:
      "A quick read on how stretched the US market looks, built only from metrics with real live data behind them.",
    gotcha:
      "Thresholds are anchored to the modern (post-1990s) valuation regime, not the full 1871–present median — see /methodology for why. Bonus Risk & Sentiment metrics are excluded from this score by design. No longer directly comparable to India's 10-signal score, by design — see /methodology.",
    source: "Derived from all other tabs. Scoring rules documented in full at /methodology.",
  },
};
