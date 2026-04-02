/**
 * Composite Score Computation
 *
 * 10 signals × (0 / 0.5 / 1 point each) = score from 0–10
 *
 * Scoring thresholds (from methodology page):
 *   #  Metric                 Bullish (1)    Neutral (0.5)    Bearish (0)
 *   1  PE Standalone Equiv    < 22           22–24            > 24
 *   2  PB Ratio               < 3.0          3.0–3.4          > 3.4
 *   3  Dividend Yield         > 1.6%         1.3–1.6%         < 1.3%
 *   4  EPS Growth YoY         > 10%          0–10%            < 0%
 *   5  Forward PE             < 17           17–20            > 20
 *   6  India-EM Premium       < 30%          30–45%           > 45%
 *   7  Trailing ERP           > 1%           -0.5% to 1%      < -0.5%
 *   8  Net FII+DII Flow       > ₹20K Cr      ₹0–20K Cr        < ₹0 Cr
 *   9  SIP Growth YoY         > 10%          0–10%            < 0%
 *  10  Mcap/GDP               < 70%          70–95%           > 95%
 *
 * Zones: ≥7 = Attractive | 5.5–7 = Neutral | 4–5.5 = Caution | 2.5–4 = Rich | <2.5 = Danger
 *
 * Null inputs → 0.5 (neutral, not penalised).
 * Exception: SIP data only available from FY17 onward; defaults to 0.5 if missing.
 */

export interface CompositeInputs {
  niftyPeStandalone: number | null;
  niftyPb: number | null;
  dividendYield: number | null;
  epsGrowthYoy: number | null;
  forwardPe: number | null;
  indiaVsEmPremium: number | null;
  trailingErp: number | null;
  fiiNetAnnual: number | null;  // annual FII net ₹ crore
  diiNetAnnual: number | null;  // annual DII net ₹ crore
  sipGrowthYoy: number | null;  // SIP YoY growth %
  mcapGdp: number | null;
}

export interface CompositeResult {
  score: number;
  zone: string;
  signals: Record<string, number>; // each signal's score for debugging
}

// score1 helper: 3-bucket signal
function s3(
  val: number | null,
  bullish: (v: number) => boolean,
  bearish: (v: number) => boolean
): number {
  if (val === null || val === undefined) return 0.5; // neutral default for missing
  if (bullish(val)) return 1;
  if (bearish(val)) return 0;
  return 0.5;
}

export function computeCompositeScore(inputs: CompositeInputs): CompositeResult {
  const {
    niftyPeStandalone, niftyPb, dividendYield, epsGrowthYoy,
    forwardPe, indiaVsEmPremium, trailingErp,
    fiiNetAnnual, diiNetAnnual, sipGrowthYoy, mcapGdp,
  } = inputs;

  // Combined FII + DII net annual flow
  const netFlow =
    fiiNetAnnual !== null && diiNetAnnual !== null
      ? fiiNetAnnual + diiNetAnnual
      : fiiNetAnnual ?? diiNetAnnual ?? null;

  const signals: Record<string, number> = {
    pe:       s3(niftyPeStandalone, v => v < 22,     v => v > 24),
    pb:       s3(niftyPb,           v => v < 3.0,    v => v > 3.4),
    dy:       s3(dividendYield,     v => v > 1.6,    v => v < 1.3),
    epsGrowth:s3(epsGrowthYoy,      v => v > 10,     v => v < 0),
    forwardPe:s3(forwardPe,         v => v < 17,     v => v > 20),
    indiaEm:  s3(indiaVsEmPremium,  v => v < 30,     v => v > 45),
    erp:      s3(trailingErp,       v => v > 1,      v => v < -0.5),
    flow:     s3(netFlow,           v => v > 20_000, v => v < 0),
    sipGrowth:s3(sipGrowthYoy,      v => v > 10,     v => v < 0),
    mcapGdp:  s3(mcapGdp,           v => v < 70,     v => v > 95),
  };

  const score = round1(Object.values(signals).reduce((a, b) => a + b, 0));
  const zone = scoreToZone(score);

  return { score, zone, signals };
}

export function scoreToZone(score: number): string {
  if (score >= 7) return "Attractive";
  if (score >= 5.5) return "Neutral";
  if (score >= 4) return "Caution";
  if (score >= 2.5) return "Rich";
  return "Danger";
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
