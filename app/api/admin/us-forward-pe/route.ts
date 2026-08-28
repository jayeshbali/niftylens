/**
 * Manual US forward PE update endpoint.
 *
 * S&P 500 forward PE has no free programmatic API. Update periodically from
 * Yardeni Research's free weekly chartbook (yardeni.com) or FactSet Earnings
 * Insight (free weekly PDF).
 *
 * POST /api/admin/us-forward-pe
 * Body: { "forwardPe": 21.5, "year": "2026" }   (year optional, defaults to current)
 *
 * Protected by ADMIN_SECRET env var (falls back to CRON_SECRET).
 */

import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const FORWARD_PE_MIN = 5;
const FORWARD_PE_MAX = 60;

function isAuthorized(request: Request): boolean {
  const secret = process.env.ADMIN_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { forwardPe?: unknown; year?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const forwardPe = Number(body.forwardPe);
  if (isNaN(forwardPe) || forwardPe < FORWARD_PE_MIN || forwardPe > FORWARD_PE_MAX) {
    return NextResponse.json(
      { error: `forwardPe must be a number between ${FORWARD_PE_MIN} and ${FORWARD_PE_MAX}` },
      { status: 400 }
    );
  }

  const year =
    typeof body.year === "string" && /^\d{4}$/.test(body.year)
      ? body.year
      : new Date().getFullYear().toString();

  const existing = await db
    .select({
      id: schema.usMarketAnnualSnapshots.id,
      bondYield10y: schema.usMarketAnnualSnapshots.bondYield10y,
    })
    .from(schema.usMarketAnnualSnapshots)
    .where(eq(schema.usMarketAnnualSnapshots.year, year))
    .limit(1);

  const bondYield10y = existing[0]?.bondYield10y ?? null;
  const forwardEarningsYield = round2((1 / forwardPe) * 100);
  const forwardErp =
    bondYield10y !== null ? round2(forwardEarningsYield - bondYield10y) : null;
  const forwardPeZone = forwardPe < 17 ? "Attractive" : forwardPe <= 21 ? "Fair" : "Expensive";

  if (existing.length > 0) {
    await db
      .update(schema.usMarketAnnualSnapshots)
      .set({ forwardPe, forwardEarningsYield, forwardErp, forwardPeZone })
      .where(eq(schema.usMarketAnnualSnapshots.year, year));
  } else {
    await db.insert(schema.usMarketAnnualSnapshots).values({
      year,
      forwardPe,
      forwardEarningsYield,
      forwardErp,
      forwardPeZone,
    });
  }

  return NextResponse.json({
    success: true,
    year,
    forwardPe,
    message: `US forward PE updated to ${forwardPe}x for ${year}`,
  });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
