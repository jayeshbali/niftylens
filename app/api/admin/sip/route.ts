/**
 * Manual SIP monthly inflow update endpoint.
 *
 * AMFI publishes SIP data ~15 days after month end but has no accessible
 * programmatic API. Check amfiindia.com/research-information/amfi-monthly
 * and enter the monthly SIP inflow figure manually.
 *
 * POST /api/admin/sip
 * Body: { "inflow": 25000, "yearMonth": "2026-03" }
 *   inflow    — monthly SIP inflow in ₹ crore
 *   yearMonth — optional, defaults to previous month
 *
 * Protected by ADMIN_SECRET env var (falls back to CRON_SECRET).
 *
 * Source reference: https://www.amfiindia.com/research-information/amfi-monthly
 */

import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";

const SIP_MIN = 1_000;   // ₹1,000 Cr — implausibly low
const SIP_MAX = 100_000; // ₹1L Cr — implausibly high

function isAuthorized(request: Request): boolean {
  const secret = process.env.ADMIN_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { inflow?: unknown; yearMonth?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const inflow = Number(body.inflow);
  if (isNaN(inflow) || inflow < SIP_MIN || inflow > SIP_MAX) {
    return NextResponse.json(
      { error: `inflow must be a number between ${SIP_MIN} and ${SIP_MAX} (₹ crore)` },
      { status: 400 }
    );
  }

  const yearMonth = resolveYearMonth(body.yearMonth);
  if (!yearMonth) {
    return NextResponse.json(
      { error: "Invalid yearMonth — expected YYYY-MM" },
      { status: 400 }
    );
  }

  await db
    .insert(schema.marketMonthlyFlows)
    .values({
      yearMonth,
      sipMonthlyInflow: inflow,
      dataSource: "amfi_manual",
      fetchedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: schema.marketMonthlyFlows.yearMonth,
      set: { sipMonthlyInflow: inflow, dataSource: "amfi_manual", fetchedAt: new Date().toISOString() },
    });

  return NextResponse.json({
    success: true,
    yearMonth,
    sipMonthlyInflow: inflow,
    message: `SIP inflow set to ₹${inflow.toLocaleString()} Cr for ${yearMonth}`,
  });
}

function resolveYearMonth(raw: unknown): string | null {
  if (typeof raw === "string" && /^\d{4}-\d{2}$/.test(raw)) return raw;

  // Default to previous calendar month
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
}
