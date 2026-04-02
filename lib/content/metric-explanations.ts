export interface MetricExplanation {
  title: string;
  what: string;
  whyUseful: string;
  gotcha?: string;
  source: string;
  currentContext?: string;
  zones?: string;
  watch?: string;
}

export const metricExplanations: Record<string, MetricExplanation> = {
  overview: {
    title: "NiftyLens \u2014 Indian Market Valuation Dashboard",
    what: "Headline score card for Indian equity markets. 10 metrics synthesised into a single composite view.",
    whyUseful:
      "This dashboard tracks March-end annual snapshots from 2000 to present. Data is updated daily for PE/PB/DY and monthly for flows. The composite score ranges from 0 (fully bearish) to 10 (fully bullish).",
    source: "Aggregated from NSE India, BSE, AMFI, NSDL, RBI, Trading Economics.",
    gotcha: "Not investment advice. Use this as one input in your own research.",
  },

  pe: {
    title: "PE Ratio",
    what: "Rupees paid per \u20b91 of trailing 12-month earnings. PE 22x = market values companies at 22\u00d7 annual profits.",
    whyUseful:
      "Most intuitive valuation check. Buying above 22x standalone PE has historically delivered negative 3-year returns.",
    gotcha:
      "Low PE on peak earnings is a trap (2008). High PE on trough earnings may be fine (2020). Cross-check with EPS Growth tab.",
    source:
      "NSE India (niftyindices.com) \u2014 PE/PB/DY reports. Post-2021 values adjusted \u00d71.175 for standalone equivalence.",
  },

  pb: {
    title: "PB Ratio",
    what: "Market price \u00f7 book value (net assets). More stable than PE \u2014 book values don't swing wildly.",
    whyUseful:
      "Independent cross-check unaffected by the 2021 PE methodology switch. Consistent 26-year series.",
    zones:
      "Below 2.5 = strong buy. 2.75\u20133.25 = fair. Above 4.5 = expensive. All-time low: 2.17 (Mar-20).",
    source: "NSE India (niftyindices.com) \u2014 same report as PE.",
  },

  dy: {
    title: "Dividend Yield",
    what: "Annual dividends as % of market price. Moves inversely to exuberance \u2014 contrarian signal.",
    whyUseful:
      "Historically reliable at extremes. Above 1.8% = strong buy (2003, 2008, 2020). Below 1.0% = caution zone.",
    gotcha:
      "Structural downward drift as companies prefer buybacks over dividends (more tax-efficient).",
    source: "NSE India (niftyindices.com) \u2014 same report as PE.",
  },

  eps: {
    title: "EPS Growth",
    what: 'Nifty 50 Earnings Per Share and growth rate. The "E" in P/E \u2014 what you\'re actually buying.',
    whyUseful:
      'PE 20x on 15% growth = attractive. PE 20x on flat earnings = vulnerable. The flat market in FY24\u201326 was absorbing strong earnings growth \u2014 a healthy "time correction."',
    watch:
      "Consensus FY27 expects ~14% recovery. Misses mean further correction.",
    source: "Derived \u2014 Nifty Level \u00f7 PE. Not NSE's published EPS.",
  },

  forwardPe: {
    title: "Forward PE",
    what: "Current price \u00f7 expected EPS over next 12 months. What professional allocators actually use.",
    whyUseful:
      "Trailing PE is backward-looking. Forward PE prices in growth. Sub-18x historically = good entry zone.",
    gotcha:
      "Sell-side consensus has a 5\u201315% optimism bias. Realistic forward PE may be 1\u20132x higher than published.",
    source:
      "Screener.in, Trendlyne, or broker research. Updated quarterly. Marked stale if >90 days old.",
  },

  indiaVsEm: {
    title: "India vs EM",
    what: "MSCI India PE \u00f7 MSCI EM PE = India's valuation premium. Drives FII allocation decisions.",
    whyUseful:
      "When India premium stretches to 60\u201380%, FIIs rotate to cheaper peers. When it compresses to 20\u201330%, India becomes relatively attractive.",
    currentContext:
      "Premium compressed significantly as China re-rated in 2025. Constructive for FII flows.",
    source:
      "Proxied via iShares MSCI India ETF (INDA) and iShares MSCI EM ETF (EEM) PE ratios. Not MSCI's institutional data.",
  },

  erp: {
    title: "Equity Risk Premium",
    what: "Earnings yield (1/PE) minus 10-year bond yield. Extra return equities offer over risk-free rate.",
    whyUseful:
      "When bonds yield more than equity earnings, stocks face a valuation headwind. Forward ERP uses consensus earnings \u2014 more relevant since equities offer growth optionality.",
    gotcha:
      'A negative trailing ERP that\'s near-zero on forward basis = "equities need to earn their keep this year."',
    source:
      "Derived \u2014 Earnings yield from NSE PE, Bond yield from Trading Economics / RBI.",
  },

  flows: {
    title: "FII/DII & SIP Flows",
    what: "Net institutional flows + monthly SIP run-rate. Supply-demand mechanics behind price action.",
    whyUseful:
      "SIP monthly inflows grew 8\u00d7 since FY17, creating a structural floor. Annual SIP contribution now dwarfs FII net flows.",
    watch:
      "SIP stoppages exceeded new registrations in early 2025 for the first time. Most SIP flows go to mid/smallcap funds.",
    source:
      "FII/DII from NSDL (fpi.nsdl.co.in) and NSE. SIP from AMFI (amfiindia.com). Monthly, with 5\u201315 day lag.",
  },

  mcapGdp: {
    title: "Mcap/GDP",
    what: 'Total BSE market cap \u00f7 India\'s GDP. Warren Buffett\'s "best single measure of where valuations stand."',
    whyUseful:
      "Macro-level check on whether equities outpace real economic output. India median ~80%.",
    gotcha:
      "Structural upward bias \u2014 more listings, GDP under-measured, overseas earnings. Use 10-year rolling average rather than all-time median.",
    source:
      "BSE total market cap (bseindia.com) \u00f7 RBI nominal GDP. Updated quarterly.",
  },

  composite: {
    title: "Composite Score",
    what: "10 metrics synthesised into 0\u201310 score. 1 point per bullish signal, 0.5 neutral, 0 bearish.",
    whyUseful:
      "In-sample R\u00b2 against 1Y forward returns computed and displayed. This is in-sample, not a backtest \u2014 treat as indicative pattern, not predictive model.",
    gotcha:
      "Historical zones: Score 7+ preceded the biggest rallies (Mar-03: +81%, Mar-09: +74%, Mar-20: +71%).",
    source:
      "Derived from all other metrics. Scoring rules documented in full at /methodology.",
  },
};
