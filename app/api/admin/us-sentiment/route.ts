/**
 * Manual US sentiment/leverage/concentration update endpoint (bonus metrics).
 *
 * AAII sentiment survey (aaii.com/sentimentsurvey), FINRA margin debt
 * statistics (finra.org/investors/learn-to-invest/advanced-investing/margin-statistics),
 * and S&P 500 top-10 concentration (from index factsheets) have no clean
 * free programmatic API. Enter figures manually here.
 *
 * POST /api/admin/us-sentiment
 * Body (all optional, at least one required):
 *   { "yearMonth": "2026-03", "aaiiBullish": 38.2, "aaiiBearish": 24.1,
 *     "aaiiNeutral": 37.7, "marginDebtBalance": 950.4, "top10ConcentrationPct": 39.5 }
 *
 * Protected by ADMIN_SECRET env var (falls back to CRON_SECRET).
 */

import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";

export const dynamic = "force-dynamic";

const FIELDS = [
  ["aaiiBullish", "aaiiBullishPct", 0, 100],
  ["aaiiBearish", "aaiiBearishPct", 0, 100],
  ["aaiiNeutral", "aaiiNeutralPct", 0, 100],
  ["marginDebtBalance", "marginDebtBalance", 0, 5000],
  ["top10ConcentrationPct", "top10ConcentrationPct", 0, 100],
] as const;

function isAuthorized(request: Request): boolean {
  const secret = process.env.ADMIN_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const set: Record<string, unknown> = {};
  for (const [bodyKey, column, min, max] of FIELDS) {
    if (body[bodyKey] === undefined) continue;
    const val = Number(body[bodyKey]);
    if (isNaN(val) || val < min || val > max) {
      return NextResponse.json(
        { error: `${bodyKey} must be a number between ${min} and ${max}` },
        { status: 400 }
      );
    }
    set[column] = val;
  }

  if (Object.keys(set).length === 0) {
    return NextResponse.json(
      { error: `Provide at least one of: ${FIELDS.map((f) => f[0]).join(", ")}` },
      { status: 400 }
    );
  }

  const yearMonth = resolveYearMonth(body.yearMonth);
  if (!yearMonth) {
    return NextResponse.json({ error: "Invalid yearMonth — expected YYYY-MM" }, { status: 400 });
  }

  set.dataSource = "manual";
  set.fetchedAt = new Date().toISOString();

  await db
    .insert(schema.usMarketMonthlyFlows)
    .values({ yearMonth, ...set })
    .onConflictDoUpdate({
      target: schema.usMarketMonthlyFlows.yearMonth,
      set,
    });

  return NextResponse.json({ success: true, yearMonth, updated: Object.keys(set) });
}

function resolveYearMonth(raw: unknown): string | null {
  if (typeof raw === "string" && /^\d{4}-\d{2}$/.test(raw)) return raw;

  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
}
