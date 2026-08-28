// Config for the 5 international markets — one shared generic system
// instead of a duplicated per-market file pattern (see lib/db/schema.ts's
// comment on why). Every field here was live-verified before writing this:
//   - Yahoo tickers: ^SSEC and ^TPX/^TOPX don't work (dead/wrong-instrument) —
//     use 000001.SS (SSE Composite) and ^N225 (Nikkei 225) instead.
//   - FRED has no long-term China bond yield series (not OECD-covered) —
//     bondFredSeries is null for China; ERP will be null there.
//   - Siblis Research (siblisresearch.com) covers PE/dividend-yield/CAPE for
//     all 5, keyed by exact country label in its tables.
//   - World Bank's CM.MKT.LCAP.GD.ZS works for every ISO country code.

import type { IntlMarketId } from "./db/schema";

export interface IntlMarketConfig {
  id: IntlMarketId;
  label: string;
  flag: string;
  indexName: string;
  currency: string;
  yahooTicker: string;
  siblisCountryLabel: string; // exact "Nation"/"Country" cell text on siblisresearch.com tables
  bondFredSeries: string | null; // null = no free source (China)
  worldBankCountryCode: string;
}

export const INTL_MARKETS: IntlMarketConfig[] = [
  {
    id: "china",
    label: "China",
    flag: "🇨🇳",
    indexName: "SSE Composite Index",
    currency: "¥",
    yahooTicker: "000001.SS",
    siblisCountryLabel: "China",
    bondFredSeries: null,
    worldBankCountryCode: "CN",
  },
  {
    id: "japan",
    label: "Japan",
    flag: "🇯🇵",
    indexName: "Nikkei 225",
    currency: "¥",
    yahooTicker: "^N225",
    siblisCountryLabel: "Japan",
    bondFredSeries: "IRLTLT01JPM156N",
    worldBankCountryCode: "JP",
  },
  {
    id: "germany",
    label: "Germany",
    flag: "🇩🇪",
    indexName: "DAX",
    currency: "€",
    yahooTicker: "^GDAXI",
    siblisCountryLabel: "Germany",
    bondFredSeries: "IRLTLT01DEM156N",
    worldBankCountryCode: "DE",
  },
  {
    id: "uk",
    label: "UK",
    flag: "🇬🇧",
    indexName: "FTSE 100",
    currency: "£",
    yahooTicker: "^FTSE",
    siblisCountryLabel: "United Kingdom",
    bondFredSeries: "IRLTLT01GBM156N",
    worldBankCountryCode: "GB",
  },
  {
    id: "france",
    label: "France",
    flag: "🇫🇷",
    indexName: "CAC 40",
    currency: "€",
    yahooTicker: "^FCHI",
    siblisCountryLabel: "France",
    bondFredSeries: "IRLTLT01FRM156N",
    worldBankCountryCode: "FR",
  },
];

export function getIntlMarket(id: string): IntlMarketConfig | undefined {
  return INTL_MARKETS.find((m) => m.id === id);
}

// Generic composite thresholds — illustrative, not country-tuned (Siblis's
// free tier only goes back to ~Dec 2023, not enough history to calibrate
// per-market bands). See lib/composite-score-intl.ts.
export const INTL_PE_BULLISH = 15;
export const INTL_PE_BEARISH = 22;
export const INTL_DY_BULLISH = 3.0;
export const INTL_DY_BEARISH = 1.5;
export const INTL_ERP_BULLISH = 1;
export const INTL_ERP_BEARISH = -0.5;
export const INTL_MCAP_GDP_BULLISH = 80;
export const INTL_MCAP_GDP_BEARISH = 130;
