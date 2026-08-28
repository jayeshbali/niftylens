import { db, schema } from "@/lib/db";
import { asc, desc } from "drizzle-orm";
import { Dashboard } from "@/components/Dashboard";
import { Footer } from "@/components/Footer";
import type { MarketSnapshot, UsMarketSnapshot } from "@/types";

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
  let usLatestMonthly = null;
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

    const [usMonthly] = await db
      .select({
        aaiiBullishPct: schema.usMarketMonthlyFlows.aaiiBullishPct,
        aaiiBearishPct: schema.usMarketMonthlyFlows.aaiiBearishPct,
        aaiiNeutralPct: schema.usMarketMonthlyFlows.aaiiNeutralPct,
        marginDebtBalance: schema.usMarketMonthlyFlows.marginDebtBalance,
        top10ConcentrationPct: schema.usMarketMonthlyFlows.top10ConcentrationPct,
      })
      .from(schema.usMarketMonthlyFlows)
      .orderBy(desc(schema.usMarketMonthlyFlows.id))
      .limit(1);
    usLatestMonthly = usMonthly ?? null;
  } catch {
    // US tables not migrated yet — dashboard shows an empty state for the US tab.
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
        usLatestMonthly={usLatestMonthly}
      />
      <Footer lastUpdated={lastUpdated} />
    </div>
  );
}
