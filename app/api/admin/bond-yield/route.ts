/**
 * Manual bond yield update endpoint.
 *
 * India 10Y G-Sec yield has no reliable free programmatic source.
 * Use this endpoint to push the current yield manually (or from a
 * paid data provider) after checking RBI / Trading Economics.
 *
 * POST /api/admin/bond-yield
 * Body: { "yield": 6.9, "date": "2026-04-02" }   (date optional, defaults to today)
 *
 * Protected by ADMIN_SECRET env var (same as CRON_SECRET if set).
 *
 * Source reference: https://www.rbi.org.in/scripts/BS_NSDPDisplay.aspx
 * or https://tradingeconomics.com/india/government-bond-yield
 */

import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const BOND_MIN = 3.0;
const BOND_MAX = 14.0;

function isAuthorized(request: Request): boolean {
  const secret = process.env.ADMIN_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return true; // open in dev
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { yield?: unknown; date?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const yieldValue = Number(body.yield);
  if (isNaN(yieldValue) || yieldValue < BOND_MIN || yieldValue > BOND_MAX) {
    return NextResponse.json(
      { error: `yield must be a number between ${BOND_MIN} and ${BOND_MAX}` },
      { status: 400 }
    );
  }

  const date =
    typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
      ? body.date
      : new Date().toISOString().slice(0, 10);

  // Check if a row exists for this date; if so update, otherwise insert a stub
  const existing = await db
    .select({ id: schema.marketDailySnapshots.id })
    .from(schema.marketDailySnapshots)
    .where(eq(schema.marketDailySnapshots.date, date))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(schema.marketDailySnapshots)
      .set({ bondYield10y: yieldValue })
      .where(eq(schema.marketDailySnapshots.date, date));
  } else {
    await db.insert(schema.marketDailySnapshots).values({
      date,
      bondYield10y: yieldValue,
      dataSource: "manual",
      fetchedAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({
    success: true,
    date,
    bondYield10y: yieldValue,
    message: `Bond yield updated to ${yieldValue}% for ${date}`,
  });
}
