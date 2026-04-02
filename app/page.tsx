import { db, schema } from "@/lib/db";
import { asc, desc } from "drizzle-orm";
import { Dashboard } from "@/components/Dashboard";
import { Footer } from "@/components/Footer";
import type { MarketSnapshot } from "@/types";

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

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: "var(--bg)", color: "var(--text-primary)" }}
    >
      <Dashboard snapshots={snapshots} lastUpdated={lastUpdated} />
      <Footer lastUpdated={lastUpdated} />
    </div>
  );
}
