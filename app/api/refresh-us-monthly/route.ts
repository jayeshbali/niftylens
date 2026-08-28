/**
 * US Annual Snapshot — mirrors app/api/refresh-monthly/route.ts's annual step.
 *
 * POST /api/refresh-us-monthly
 * Body (optional): { "yearMonth": "2026-12" }
 *   yearMonth defaults to the previous calendar month.
 *
 * Only does anything when yearMonth is December: computes the annual
 * (calendar-year) snapshot — EPS growth, ERP, Mcap/GDP (World Bank),
 * composite score — from the last daily snapshot of that December, and
 * upserts it. (Forward PE and foreign/fund flows were dropped — no free
 * data source — so there's no monthly aggregation step left to do.)
 *
 * Protected by ADMIN_SECRET / CRON_SECRET env var.
 */

import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import type { NewUsMarketAnnualSnapshot } from "@/lib/db/schema";

export const dynamic = "force-dynamic";
import { eq, gte, lte, and, desc } from "drizzle-orm";
import { SP500_PE_MEDIAN, SP500_PB_MEDIAN, SP500_DY_MEDIAN, CAPE_MEDIAN } from "@/lib/constants-us";
import { computeUsCompositeScore } from "@/lib/composite-score-us";
import { fetchMcapGdpLatest } from "@/lib/data-sources/world-bank";

function isAuthorized(request: Request): boolean {
  const secret = process.env.ADMIN_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { yearMonth?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    // empty body is fine
  }

  const yearMonth = resolveYearMonth(body.yearMonth);
  if (!yearMonth) {
    return NextResponse.json({ error: "Invalid yearMonth — expected YYYY-MM" }, { status: 400 });
  }

  const [year, month] = yearMonth.split("-");
  console.log(`[refresh-us-monthly] processing ${yearMonth}`);

  let annualResult: Record<string, unknown> | null = null;
  if (month === "12") {
    annualResult = await computeAndUpsertAnnualSnapshot(year);
  }

  return NextResponse.json({ success: true, yearMonth, annual: annualResult });
}

// ─── Annual snapshot computation ────────────────────────────────────────────

async function computeAndUpsertAnnualSnapshot(year: string): Promise<Record<string, unknown>> {
  console.log(`[us-annual] computing ${year}`);

  const [lastDaily] = await db
    .select()
    .from(schema.usMarketDailySnapshots)
    .where(
      and(
        gte(schema.usMarketDailySnapshots.date, `${year}-12-01`),
        lte(schema.usMarketDailySnapshots.date, `${year}-12-31`)
      )
    )
    .orderBy(desc(schema.usMarketDailySnapshots.date))
    .limit(1);

  if (!lastDaily) {
    return { error: `No daily snapshots found for December ${year}` };
  }

  const {
    sp500Level, sp500PeTrailing, sp500Pb, dividendYield, sp500Eps,
    capeRatio, bondYield10y, usVsExUsPremium,
  } = lastDaily;

  // ── EPS growth — look up previous year's annual row ────────────────────────
  const prevYear = String(parseInt(year) - 1);
  const [prevAnnual] = await db
    .select({ sp500Eps: schema.usMarketAnnualSnapshots.sp500Eps })
    .from(schema.usMarketAnnualSnapshots)
    .where(eq(schema.usMarketAnnualSnapshots.year, prevYear))
    .limit(1);

  const prevEps = prevAnnual?.sp500Eps ?? null;
  const epsGrowthYoy =
    sp500Eps !== null && prevEps !== null && prevEps > 0
      ? round2(((sp500Eps - prevEps) / prevEps) * 100)
      : null;

  const prev3Year = String(parseInt(year) - 3);
  const [prev3Annual] = await db
    .select({ sp500Eps: schema.usMarketAnnualSnapshots.sp500Eps })
    .from(schema.usMarketAnnualSnapshots)
    .where(eq(schema.usMarketAnnualSnapshots.year, prev3Year))
    .limit(1);

  const prev3Eps = prev3Annual?.sp500Eps ?? null;
  const eps3yCagr =
    sp500Eps !== null && prev3Eps !== null && prev3Eps > 0
      ? round2(((sp500Eps / prev3Eps) ** (1 / 3) - 1) * 100)
      : null;

  // ── ERP ─────────────────────────────────────────────────────────────────────
  const trailingEarningsYield =
    sp500PeTrailing !== null && sp500PeTrailing > 0
      ? round2((1 / sp500PeTrailing) * 100)
      : null;

  const trailingErp =
    trailingEarningsYield !== null && bondYield10y !== null
      ? round2(+(trailingEarningsYield - bondYield10y).toFixed(2))
      : null;

  // ── PE premium / discount vs long-run median ────────────────────────────────
  const pePremiumDiscount =
    sp500PeTrailing !== null
      ? round2(((sp500PeTrailing - SP500_PE_MEDIAN) / SP500_PE_MEDIAN) * 100)
      : null;

  // ── Mcap/GDP — World Bank (fresh fetch; annual-frequency official data) ────
  const mcapGdpRes = await fetchMcapGdpLatest("US");
  const mcapGdp = mcapGdpRes.latest?.value ?? null;

  // ── Composite score ─────────────────────────────────────────────────────────
  const { score: compositeScore, zone: compositeZone } = computeUsCompositeScore({
    sp500PeTrailing,
    sp500Pb,
    dividendYield,
    epsGrowthYoy,
    usVsExUsPremium,
    trailingErp,
    mcapGdp,
  });

  // ── Signal zones ─────────────────────────────────────────────────────────────
  const pbZone = sp500Pb !== null
    ? sp500Pb < 3.0 ? "Attractive" : sp500Pb <= 4.0 ? "Fair" : sp500Pb <= 5.0 ? "Expensive" : "Stretched"
    : null;

  const dySignal = dividendYield !== null
    ? dividendYield > 2.0 ? "Attractive" : dividendYield >= 1.3 ? "Fair-Cheap" : "Expensive"
    : null;

  const usVsExUsSignal = usVsExUsPremium !== null
    ? usVsExUsPremium < 30 ? "Attractive" : usVsExUsPremium <= 45 ? "Normal" : "Expensive"
    : null;

  const erpSignal = trailingErp !== null
    ? trailingErp > 1 ? "Attractive" : trailingErp >= -0.5 ? "Bonds Competitive" : "Danger"
    : null;

  const mcapGdpZone = mcapGdp !== null
    ? mcapGdp < 100 ? "Attractive" : mcapGdp <= 150 ? "Normal" : "Expensive"
    : null;

  const annualPayload: NewUsMarketAnnualSnapshot = {
    year,

    sp500Level,
    sp500PeTrailing,
    sp500PeMedian: SP500_PE_MEDIAN,
    pePremiumDiscount,

    sp500Pb,
    pbMedian: SP500_PB_MEDIAN,
    pbZone,

    dividendYield,
    dyMedian: SP500_DY_MEDIAN,
    dySignal,

    sp500Eps,
    epsGrowthYoy,
    eps3yCagr,

    capeRatio,
    capeMedian: CAPE_MEDIAN,

    usVsExUsPremium,
    usVsExUsSignal,

    bondYield10y,
    trailingEarningsYield,
    trailingErp,
    erpSignal,

    mcapGdp,
    mcapGdpZone,

    compositeScore,
    compositeZone,

    updatedAt: new Date().toISOString(),
  };

  await db
    .insert(schema.usMarketAnnualSnapshots)
    .values(annualPayload)
    .onConflictDoUpdate({
      target: schema.usMarketAnnualSnapshots.year,
      set: annualPayload,
    });

  console.log(`[us-annual] ${year} upserted — PE=${sp500PeTrailing} composite=${compositeScore} (${compositeZone})`);

  return { year, sp500Level, sp500PeTrailing, compositeScore, compositeZone, mcapGdp };
}

function resolveYearMonth(raw: unknown): string | null {
  if (typeof raw === "string" && /^\d{4}-\d{2}$/.test(raw)) return raw;

  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
