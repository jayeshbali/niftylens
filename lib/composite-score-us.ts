/**
 * US Composite Score Computation — mirrors lib/composite-score.ts's
 * 10-signal structure 1:1 for cross-market comparability. Bonus risk/
 * sentiment metrics (CAPE, VIX, credit spread, etc.) are informational-only
 * in the Risk & Sentiment tab and are NOT folded into this score.
 *
 * Thresholds below are illustrative, anchored to commonly-cited long-run
 * S&P 500 figures adjusted for the post-1990s valuation regime (median PE/PB/DY
 * from the full 1871–present series would be far stricter than modern norms —
 * see lib/constants-us.ts). Consider recomputing from the ingested historical
 * series once seeded.
 *
 *  #  Metric                    Bullish (1)   Neutral (0.5)   Bearish (0)
 *  1  S&P 500 PE (trailing)     < 17          17–22            > 22
 *  2  S&P 500 PB                < 3.0         3.0–4.0          > 4.0
 *  3  Dividend Yield            > 2.0%        1.3–2.0%         < 1.3%
 *  4  EPS Growth YoY            > 10%         0–10%            < 0%
 *  5  Forward PE                < 17          17–21            > 21
 *  6  US vs Ex-US Premium       < 30%         30–45%           > 45%
 *  7  Trailing ERP              > 1%          -0.5% to 1%      < -0.5%
 *  8  Net Foreign + Fund Flow   > $100B       $0–100B          < $0
 *  9  Fund Flow Growth YoY      > 10%         0–10%            < 0%
 * 10  Mcap/GDP (Buffett Ind.)   < 100%        100–150%         > 150%
 */

import { scoreToZone } from "./composite-score";

export interface UsCompositeInputs {
  sp500PeTrailing: number | null;
  sp500Pb: number | null;
  dividendYield: number | null;
  epsGrowthYoy: number | null;
  forwardPe: number | null;
  usVsExUsPremium: number | null;
  trailingErp: number | null;
  foreignNetFlowAnnual: number | null; // $ billion
  fundNetFlowAnnual: number | null;    // $ billion
  fundFlowGrowthYoy: number | null;    // %
  mcapGdp: number | null;
}

export interface UsCompositeResult {
  score: number;
  zone: string;
  signals: Record<string, number>;
}

function s3(
  val: number | null,
  bullish: (v: number) => boolean,
  bearish: (v: number) => boolean
): number {
  if (val === null || val === undefined) return 0.5;
  if (bullish(val)) return 1;
  if (bearish(val)) return 0;
  return 0.5;
}

export function computeUsCompositeScore(inputs: UsCompositeInputs): UsCompositeResult {
  const {
    sp500PeTrailing, sp500Pb, dividendYield, epsGrowthYoy,
    forwardPe, usVsExUsPremium, trailingErp,
    foreignNetFlowAnnual, fundNetFlowAnnual, fundFlowGrowthYoy, mcapGdp,
  } = inputs;

  const netFlow =
    foreignNetFlowAnnual !== null && fundNetFlowAnnual !== null
      ? foreignNetFlowAnnual + fundNetFlowAnnual
      : foreignNetFlowAnnual ?? fundNetFlowAnnual ?? null;

  const signals: Record<string, number> = {
    pe:        s3(sp500PeTrailing,   v => v < 17,   v => v > 22),
    pb:        s3(sp500Pb,           v => v < 3.0,  v => v > 4.0),
    dy:        s3(dividendYield,     v => v > 2.0,  v => v < 1.3),
    epsGrowth: s3(epsGrowthYoy,      v => v > 10,   v => v < 0),
    forwardPe: s3(forwardPe,         v => v < 17,   v => v > 21),
    usVsExUs:  s3(usVsExUsPremium,   v => v < 30,   v => v > 45),
    erp:       s3(trailingErp,       v => v > 1,    v => v < -0.5),
    flow:      s3(netFlow,           v => v > 100,  v => v < 0),
    fundGrowth:s3(fundFlowGrowthYoy, v => v > 10,   v => v < 0),
    mcapGdp:   s3(mcapGdp,           v => v < 100,  v => v > 150),
  };

  const score = round1(Object.values(signals).reduce((a, b) => a + b, 0));
  const zone = scoreToZone(score);

  return { score, zone, signals };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
