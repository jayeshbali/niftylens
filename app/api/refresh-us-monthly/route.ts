/**
 * US Monthly/Annual Snapshot — mirrors app/api/refresh-monthly/route.ts.
 *
 * POST /api/refresh-us-monthly
 * Body (optional): { "yearMonth": "2026-12" }
 *   yearMonth defaults to the previous calendar month.
 *
 * Unlike India, there's no daily foreign/fund-flow feed to sum here —
 * foreignNetMonthly/fundNetMonthly are entered directly via
 * POST /api/admin/us-flows (Treasury TIC / ICI have no free API). This
 * route's job is: when yearMonth is December, compute the annual
 * (calendar-year) snapshot — EPS growth, ERP, Mcap/GDP (World Bank),
 * composite score — and upsert it.
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
import { fetchMcapGdpLatest } from "@/lib/data-sources/us/world-bank";

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

  // ── Aggregate calendar-year flows ──────────────────────────────────────────
  const fyMonthly = await db
    .select({
      foreignNetMonthly: schema.usMarketMonthlyFlows.foreignNetMonthly,
      fundNetMonthly: schema.usMarketMonthlyFlows.fundNetMonthly,
    })
    .from(schema.usMarketMonthlyFlows)
    .where(
      and(
        gte(schema.usMarketMonthlyFlows.yearMonth, `${year}-01`),
        lte(schema.usMarketMonthlyFlows.yearMonth, `${year}-12`)
      )
    );

  const foreignNetAnnual = fyMonthly.some((r) => r.foreignNetMonthly !== null)
    ? round2(fyMonthly.reduce((s, r) => s + (r.foreignNetMonthly ?? 0), 0))
    : null;
  const fundNetAnnual = fyMonthly.some((r) => r.fundNetMonthly !== null)
    ? round2(fyMonthly.reduce((s, r) => s + (r.fundNetMonthly ?? 0), 0))
    : null;

  // ── Raw from daily snapshot ─────────────────────────────────────────────────
  const {
    sp500Level, sp500PeTrailing, sp500Pb, dividendYield, sp500Eps,
    capeRatio, bondYield10y, usVsExUsPremium,
  } = lastDaily;

  // ── EPS growth — look up previous year's annual row ────────────────────────
  const prevYear = String(parseInt(year) - 1);
  const [prevAnnual] = await db
    .select({ sp500Eps: schema.usMarketAnnualSnapshots.sp500Eps, fundNetFlow: schema.usMarketAnnualSnapshots.fundNetFlow })
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

  const prevFundNet = prevAnnual?.fundNetFlow ?? null;
  const fundFlowGrowthYoy =
    fundNetAnnual !== null && prevFundNet !== null && prevFundNet > 0
      ? round2(((fundNetAnnual - prevFundNet) / prevFundNet) * 100)
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

  // ── Forward PE — carried forward from last annual row (manual entry) ───────
  const [lastAnnual] = await db
    .select({ forwardPe: schema.usMarketAnnualSnapshots.forwardPe })
    .from(schema.usMarketAnnualSnapshots)
    .orderBy(desc(schema.usMarketAnnualSnapshots.id))
    .limit(1);

  const forwardPe = lastAnnual?.forwardPe ?? null;
  const forwardEarningsYield =
    forwardPe !== null && forwardPe > 0 ? round2((1 / forwardPe) * 100) : null;
  const forwardErp =
    forwardEarningsYield !== null && bondYield10y !== null
      ? round2(+(forwardEarningsYield - bondYield10y).toFixed(2))
      : null;

  // ── Mcap/GDP — World Bank (fresh fetch; annual-frequency official data) ────
  const mcapGdpRes = await fetchMcapGdpLatest();
  const mcapGdp = mcapGdpRes.latest?.value ?? null;

  // ── Composite score ─────────────────────────────────────────────────────────
  const { score: compositeScore, zone: compositeZone } = computeUsCompositeScore({
    sp500PeTrailing,
    sp500Pb,
    dividendYield,
    epsGrowthYoy,
    forwardPe,
    usVsExUsPremium,
    trailingErp,
    foreignNetFlowAnnual: foreignNetAnnual,
    fundNetFlowAnnual: fundNetAnnual,
    fundFlowGrowthYoy,
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

  const forwardPeZone = forwardPe !== null
    ? forwardPe < 17 ? "Attractive" : forwardPe <= 21 ? "Fair" : "Expensive"
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

    forwardPe,
    forwardPeZone,
    impliedEpsGrowth: null,

    capeRatio,
    capeMedian: CAPE_MEDIAN,

    usVsExUsPremium,
    usVsExUsSignal,

    bondYield10y,
    trailingEarningsYield,
    forwardEarningsYield,
    trailingErp,
    forwardErp,
    erpSignal,

    foreignNetFlow: foreignNetAnnual,
    fundNetFlow: fundNetAnnual,
    fundFlowGrowthYoy,

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

  return {
    year,
    sp500Level,
    sp500PeTrailing,
    compositeScore,
    compositeZone,
    mcapGdp,
    foreignNetAnnual,
    fundNetAnnual,
  };
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
