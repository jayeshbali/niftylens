export interface MarketSnapshot {
  id: number;
  year: string;

  // Nifty 50
  niftyLevel: number | null;
  niftyPePublished: number | null;
  niftyPeStandalone: number | null;
  niftyPeMedian: number | null;
  pePremiumDiscount: number | null;

  // Midcap 100
  midcapPePublished: number | null;
  midcapPeStandalone: number | null;
  midcapPeMedian: number | null;
  midcapPremiumDiscount: number | null;

  // Smallcap 100
  smallcapPePublished: number | null;
  smallcapPeStandalone: number | null;
  smallcapPeMedian: number | null;
  smallcapPremiumDiscount: number | null;

  // PB
  niftyPb: number | null;
  pbMedian: number | null;
  pbZone: string | null;

  // Dividend Yield
  dividendYield: number | null;
  dyMedian: number | null;
  dySignal: string | null;

  // EPS
  niftyEps: number | null;
  epsGrowthYoy: number | null;
  eps3yCagr: number | null;

  // Forward PE
  forwardPe: number | null;
  forwardPeZone: string | null;
  impliedEpsGrowth: number | null;

  // MSCI
  msciIndiaPe: number | null;
  msciEmPe: number | null;
  indiaVsEmPremium: number | null;
  indiaVsEmSignal: string | null;

  // ERP
  bondYield10y: number | null;
  trailingEarningsYield: number | null;
  forwardEarningsYield: number | null;
  trailingErp: number | null;
  forwardErp: number | null;
  erpSignal: string | null;

  // Flows
  fiiNet: number | null;
  diiNet: number | null;
  sipMonthlyAvg: number | null;

  // Mcap/GDP
  mcapGdp: number | null;
  mcapGdpZone: string | null;

  // Composite
  compositeScore: number | null;
  compositeZone: string | null;

  // 1Y Forward Return
  nifty1yForwardReturn: number | null;

  // Metadata
  createdAt: string | null;
  updatedAt: string | null;
}
