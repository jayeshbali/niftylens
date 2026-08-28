/**
 * Daily refresh for the 5 international markets — index level only (the one
 * genuinely daily-fresh metric here). PE/dividend-yield/CAPE update
 * semi-annually on Siblis Research's free tier — see /api/refresh-intl-siblis.
 *
 * GET  /api/refresh-intl  — Vercel Cron
 * POST /api/refresh-intl  — manual trigger
 */

import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import type { NewIntlMarketDailySnapshot } from "@/lib/db/schema";
import { INTL_MARKETS } from "@/lib/constants-intl";
import { fetchIntlIndexLevel } from "@/lib/data-sources/intl-yahoo";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runRefreshIntl();
}

export async function POST() {
  return runRefreshIntl();
}

async function runRefreshIntl() {
  const fetchedAt = new Date().toISOString();
  const date = fetchedAt.slice(0, 10);

  const results = await Promise.all(
    INTL_MARKETS.map(async (m) => {
      const res = await fetchIntlIndexLevel(m.yahooTicker);
      return { market: m.id, res };
    })
  );

  for (const { market, res } of results) {
    if (res.price === undefined) continue;

    const payload: NewIntlMarketDailySnapshot = {
      market,
      date,
      indexLevel: res.price,
      dataSource: "yahoo_live",
      fetchedAt,
    };

    await db
      .insert(schema.intlMarketDailySnapshots)
      .values(payload)
      .onConflictDoUpdate({
        target: [schema.intlMarketDailySnapshots.market, schema.intlMarketDailySnapshots.date],
        set: payload,
      });
  }

  console.log(`[refresh-intl] done ${date} — ${results.filter((r) => r.res.price !== undefined).length}/${results.length} markets`);

  return NextResponse.json({
    success: true,
    date,
    results: results.map(({ market, res }) => ({ market, price: res.price, error: res.error })),
  });
}
