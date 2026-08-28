/**
 * Composite score for the 5 international markets (China, Japan, Germany,
 * UK, France) — one shared, leaner function. Only 4 signals, since that's
 * what's genuinely available for all of them (no P/B, no EPS growth
 * reliably computable from ~6 semi-annual snapshots). China's ERP is
 * always null (no free bond yield source) and defaults to neutral, same
 * null-handling pattern as every other composite function in this codebase.
 *
 * Thresholds are illustrative/generic, not country-tuned — there isn't
 * enough history yet to calibrate per-market bands. See /methodology.
 *
 *  #  Metric          Bullish (1)   Neutral (0.5)   Bearish (0)
 *  1  PE (trailing)   < 15          15–22            > 22
 *  2  Dividend Yield  > 3.0%        1.5–3.0%         < 1.5%
 *  3  Trailing ERP    > 1%          -0.5% to 1%      < -0.5%
 *  4  Mcap/GDP        < 80%         80–130%          > 130%
 */

import { scoreToZone } from "./composite-score";
import {
  INTL_PE_BULLISH, INTL_PE_BEARISH,
  INTL_DY_BULLISH, INTL_DY_BEARISH,
  INTL_ERP_BULLISH, INTL_ERP_BEARISH,
  INTL_MCAP_GDP_BULLISH, INTL_MCAP_GDP_BEARISH,
} from "./constants-intl";

export interface IntlCompositeInputs {
  peTrailing: number | null;
  dividendYield: number | null;
  trailingErp: number | null;
  mcapGdp: number | null;
}

export interface IntlCompositeResult {
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

export function computeIntlCompositeScore(inputs: IntlCompositeInputs): IntlCompositeResult {
  const { peTrailing, dividendYield, trailingErp, mcapGdp } = inputs;

  const signals: Record<string, number> = {
    pe:      s3(peTrailing,    v => v < INTL_PE_BULLISH,  v => v > INTL_PE_BEARISH),
    dy:      s3(dividendYield, v => v > INTL_DY_BULLISH,  v => v < INTL_DY_BEARISH),
    erp:     s3(trailingErp,   v => v > INTL_ERP_BULLISH, v => v < INTL_ERP_BEARISH),
    mcapGdp: s3(mcapGdp,       v => v < INTL_MCAP_GDP_BULLISH, v => v > INTL_MCAP_GDP_BEARISH),
  };

  const signalCount = Object.keys(signals).length;
  const score = round1((Object.values(signals).reduce((a, b) => a + b, 0) / signalCount) * 10);
  const zone = scoreToZone(score);

  return { score, zone, signals };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
