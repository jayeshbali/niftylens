/**
 * Manual US foreign/fund flow update endpoint.
 *
 * Treasury TIC (home.treasury.gov/data/treasury-international-capital-tic-system)
 * and ICI long-term fund flow reports (ici.org/research) have no clean free
 * programmatic API. Enter the monthly figures manually here.
 *
 * POST /api/admin/us-flows
 * Body: { "foreignNet": 45.2, "fundNet": -12.8, "yearMonth": "2026-03" }
 *   foreignNet / fundNet — $ billion net, at least one required
 *   yearMonth            — optional, defaults to previous month
 *
 * Protected by ADMIN_SECRET env var (falls back to CRON_SECRET).
 */

import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";

export const dynamic = "force-dynamic";

const FLOW_MIN = -500; // $ billion
const FLOW_MAX = 500;

function isAuthorized(request: Request): boolean {
  const secret = process.env.ADMIN_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { foreignNet?: unknown; fundNet?: unknown; yearMonth?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const foreignNet = body.foreignNet !== undefined ? Number(body.foreignNet) : null;
  const fundNet = body.fundNet !== undefined ? Number(body.fundNet) : null;

  if (foreignNet === null && fundNet === null) {
    return NextResponse.json({ error: "Provide at least one of foreignNet or fundNet" }, { status: 400 });
  }
  for (const [name, val] of [["foreignNet", foreignNet], ["fundNet", fundNet]] as const) {
    if (val !== null && (isNaN(val) || val < FLOW_MIN || val > FLOW_MAX)) {
      return NextResponse.json(
        { error: `${name} must be a number between ${FLOW_MIN} and ${FLOW_MAX} ($ billion)` },
        { status: 400 }
      );
    }
  }

  const yearMonth = resolveYearMonth(body.yearMonth);
  if (!yearMonth) {
    return NextResponse.json({ error: "Invalid yearMonth — expected YYYY-MM" }, { status: 400 });
  }

  const set: Record<string, unknown> = { dataSource: "manual", fetchedAt: new Date().toISOString() };
  if (foreignNet !== null) set.foreignNetMonthly = foreignNet;
  if (fundNet !== null) set.fundNetMonthly = fundNet;

  await db
    .insert(schema.usMarketMonthlyFlows)
    .values({ yearMonth, ...set })
    .onConflictDoUpdate({
      target: schema.usMarketMonthlyFlows.yearMonth,
      set,
    });

  return NextResponse.json({
    success: true,
    yearMonth,
    foreignNet,
    fundNet,
    message: `US flows updated for ${yearMonth}`,
  });
}

function resolveYearMonth(raw: unknown): string | null {
  if (typeof raw === "string" && /^\d{4}-\d{2}$/.test(raw)) return raw;

  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
}
