import { db, schema } from "@/lib/db";
import { asc, desc, eq } from "drizzle-orm";
import { Dashboard } from "@/components/Dashboard";
import { Footer } from "@/components/Footer";
import type { MarketSnapshot, UsMarketSnapshot } from "@/types";
import type { IntlMarketSnapshot } from "@/lib/db/schema";
import { INTL_MARKETS } from "@/lib/constants-intl";

export const dynamic = "force-dynamic";

export default async function Home() {
  const rows = await db
    .select()
    .from(schema.marketAnnualSnapshots)
    .orderBy(asc(schema.marketAnnualSnapshots.id));

  const snapshots = rows as MarketSnapshot[];

  // Use the latest daily snapshot's fetchedAt as the staleness timestamp.
  // Falls back to "now" when no cron has run yet (initial deploy).
  let lastUpdated: string;
  try {
    const [latestDaily] = await db
      .select({ fetchedAt: schema.marketDailySnapshots.fetchedAt })
      .from(schema.marketDailySnapshots)
      .orderBy(desc(schema.marketDailySnapshots.id))
      .limit(1);
    lastUpdated = latestDaily?.fetchedAt ?? new Date().toISOString();
  } catch {
    lastUpdated = new Date().toISOString();
  }

  // US market data — tables may not exist yet (pre-migration), so fail soft.
  let usSnapshots: UsMarketSnapshot[] = [];
  let usLastUpdated = new Date().toISOString();
  let usLatestDaily = null;
  try {
    const usRows = await db
      .select()
      .from(schema.usMarketAnnualSnapshots)
      .orderBy(asc(schema.usMarketAnnualSnapshots.id));
    usSnapshots = usRows as UsMarketSnapshot[];

    const [usDaily] = await db
      .select({
        fetchedAt: schema.usMarketDailySnapshots.fetchedAt,
        vix: schema.usMarketDailySnapshots.vix,
        hySpread: schema.usMarketDailySnapshots.hySpread,
        yieldCurve10y2y: schema.usMarketDailySnapshots.yieldCurve10y2y,
        realYield10y: schema.usMarketDailySnapshots.realYield10y,
      })
      .from(schema.usMarketDailySnapshots)
      .orderBy(desc(schema.usMarketDailySnapshots.id))
      .limit(1);
    usLastUpdated = usDaily?.fetchedAt ?? usLastUpdated;
    usLatestDaily = usDaily ?? null;
  } catch {
    // US tables not migrated yet — dashboard shows an empty state for the US tab.
  }

  // International markets (China, Japan, Germany, UK, France) — small
  // tables, fine to fetch all up front per market like India/US already do.
  const intlSnapshots: Record<string, IntlMarketSnapshot[]> = {};
  const intlLatestIndexLevel: Record<string, number | null> = {};
  let intlLastUpdated = new Date().toISOString();
  try {
    for (const m of INTL_MARKETS) {
      const marketRows = await db
        .select()
        .from(schema.intlMarketSnapshots)
        .where(eq(schema.intlMarketSnapshots.market, m.id))
        .orderBy(asc(schema.intlMarketSnapshots.period));
      intlSnapshots[m.id] = marketRows;

      const [dailyRow] = await db
        .select({ indexLevel: schema.intlMarketDailySnapshots.indexLevel, fetchedAt: schema.intlMarketDailySnapshots.fetchedAt })
        .from(schema.intlMarketDailySnapshots)
        .where(eq(schema.intlMarketDailySnapshots.market, m.id))
        .orderBy(desc(schema.intlMarketDailySnapshots.id))
        .limit(1);
      intlLatestIndexLevel[m.id] = dailyRow?.indexLevel ?? null;
      if (dailyRow?.fetchedAt) intlLastUpdated = dailyRow.fetchedAt;
    }
  } catch {
    // Intl tables not migrated yet — dashboard shows an empty state.
  }

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: "var(--bg)", color: "var(--text-primary)" }}
    >
      <Dashboard
        snapshots={snapshots}
        lastUpdated={lastUpdated}
        usSnapshots={usSnapshots}
        usLastUpdated={usLastUpdated}
        usLatestDaily={usLatestDaily}
        intlSnapshots={intlSnapshots}
        intlLatestIndexLevel={intlLatestIndexLevel}
        intlLastUpdated={intlLastUpdated}
      />
      <Footer lastUpdated={lastUpdated} />
    </div>
  );
}
