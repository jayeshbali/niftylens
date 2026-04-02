/**
 * F6-Monthly: Monthly Data Aggregation + March-end Annual Snapshot
 *
 * POST /api/refresh-monthly
 * Body (all optional):
 *   { "yearMonth": "2026-03", "sipInflow": 25000 }
 *
 * - yearMonth defaults to the previous calendar month
 * - sipInflow (₹ crore) can be supplied directly; otherwise falls back
 *   to the last known value in market_monthly_flows
 *
 * What it does:
 *   1. Sums FII/DII net daily flows from market_daily_snapshots for yearMonth
 *   2. Upserts result to market_monthly_flows
 *   3. If yearMonth is a March (annual boundary), triggers annual snapshot:
 *      - Reads last daily snapshot of that March
 *      - Aggregates 12-month flows for the fiscal year (Apr prev → Mar curr)
 *      - Computes EPS, EPS growth YoY, EPS 3Y CAGR
 *      - Computes composite score
 *      - Upserts to market_annual_snapshots with year label "Mar-YY"
 *
 * Protected by ADMIN_SECRET / CRON_SECRET env var.
 */

import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import type { NewMarketAnnualSnapshot, NewMarketMonthlyFlow } from "@/lib/db/schema";
import { eq, gte, lte, and, isNotNull, desc, sql } from "drizzle-orm";
import { PE_ADJUSTMENT_FACTOR, PE_CONSOLIDATION_DATE } from "@/lib/constants";
import { computeCompositeScore } from "@/lib/composite-score";

function isAuthorized(request: Request): boolean {
  const secret = process.env.ADMIN_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { yearMonth?: unknown; sipInflow?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    // empty body is fine — all params are optional
  }

  // ── Resolve yearMonth ────────────────────────────────────────────────────────
  const yearMonth = resolveYearMonth(body.yearMonth);
  if (!yearMonth) {
    return NextResponse.json(
      { error: "Invalid yearMonth — expected YYYY-MM" },
      { status: 400 }
    );
  }

  const sipInflow =
    typeof body.sipInflow === "number" && body.sipInflow > 0
      ? body.sipInflow
      : null;

  console.log(`[refresh-monthly] processing ${yearMonth}`, sipInflow ? `SIP=${sipInflow}` : "");

  // ── Step 1: Aggregate FII/DII from daily snapshots ───────────────────────────
  const [ym_year, ym_month] = yearMonth.split("-");
  const dateStart = `${ym_year}-${ym_month}-01`;
  const dateEnd   = `${ym_year}-${ym_month}-31`; // upper bound — daily rows use YYYY-MM-DD

  const dailyRows = await db
    .select({
      fiiNetDaily: schema.marketDailySnapshots.fiiNetDaily,
      diiNetDaily: schema.marketDailySnapshots.diiNetDaily,
    })
    .from(schema.marketDailySnapshots)
    .where(
      and(
        gte(schema.marketDailySnapshots.date, dateStart),
        lte(schema.marketDailySnapshots.date, dateEnd),
        isNotNull(schema.marketDailySnapshots.fiiNetDaily)
      )
    );

  const tradingDays = dailyRows.length;
  const fiiNetMonthly = tradingDays > 0
    ? round2(dailyRows.reduce((s, r) => s + (r.fiiNetDaily ?? 0), 0))
    : null;
  const diiNetMonthly = tradingDays > 0
    ? round2(dailyRows.reduce((s, r) => s + (r.diiNetDaily ?? 0), 0))
    : null;

  // ── Step 2: Resolve SIP — supplied > DB fallback ────────────────────────────
  let resolvedSip = sipInflow;
  if (resolvedSip === null) {
    const [lastSip] = await db
      .select({ sipMonthlyInflow: schema.marketMonthlyFlows.sipMonthlyInflow })
      .from(schema.marketMonthlyFlows)
      .where(isNotNull(schema.marketMonthlyFlows.sipMonthlyInflow))
      .orderBy(desc(schema.marketMonthlyFlows.id))
      .limit(1);
    if (lastSip?.sipMonthlyInflow) {
      console.log(`[refresh-monthly] SIP not supplied, using last known: ${lastSip.sipMonthlyInflow}`);
      resolvedSip = lastSip.sipMonthlyInflow;
    }
  }

  // ── Step 3: Upsert to market_monthly_flows ───────────────────────────────────
  const sourceTags: string[] = [];
  if (tradingDays > 0) sourceTags.push("nse_daily_sum");
  if (sipInflow !== null) sourceTags.push("sip_manual");
  else if (resolvedSip !== null) sourceTags.push("sip_fallback");

  const monthlyPayload: NewMarketMonthlyFlow = {
    yearMonth,
    fiiNetMonthly,
    diiNetMonthly,
    sipMonthlyInflow: resolvedSip,
    tradingDays,
    dataSource: sourceTags.join(",") || "no_data",
    fetchedAt: new Date().toISOString(),
  };

  await db
    .insert(schema.marketMonthlyFlows)
    .values(monthlyPayload)
    .onConflictDoUpdate({
      target: schema.marketMonthlyFlows.yearMonth,
      set: monthlyPayload,
    });

  console.log(`[refresh-monthly] monthly upsert done — ${yearMonth} fii=${fiiNetMonthly} dii=${diiNetMonthly} sip=${resolvedSip} days=${tradingDays}`);

  // ── Step 4: March-end annual snapshot ───────────────────────────────────────
  let annualResult: Record<string, unknown> | null = null;

  if (ym_month === "03") {
    annualResult = await computeAndUpsertAnnualSnapshot(ym_year);
  }

  return NextResponse.json({
    success: true,
    yearMonth,
    monthly: { fiiNetMonthly, diiNetMonthly, sipMonthlyInflow: resolvedSip, tradingDays },
    sources: sourceTags,
    annual: annualResult,
  });
}

// ─── Annual snapshot computation ────────────────────────────────────────────

async function computeAndUpsertAnnualSnapshot(
  year: string
): Promise<Record<string, unknown>> {
  const yearLabel = `Mar-${year.slice(-2)}`; // "2026" → "Mar-26"
  console.log(`[annual] computing ${yearLabel}`);

  // ── Get last daily snapshot for March ──────────────────────────────────────
  const [lastDaily] = await db
    .select()
    .from(schema.marketDailySnapshots)
    .where(
      and(
        gte(schema.marketDailySnapshots.date, `${year}-03-01`),
        lte(schema.marketDailySnapshots.date, `${year}-03-31`)
      )
    )
    .orderBy(desc(schema.marketDailySnapshots.date))
    .limit(1);

  if (!lastDaily) {
    return { error: `No daily snapshots found for March ${year}` };
  }

  // ── Aggregate 12-month FII/DII flows for the fiscal year (Apr prev → Mar curr) ─
  const fyStart = `${parseInt(year) - 1}-04-01`;
  const fyEnd   = `${year}-03-31`;

  const fyMonthly = await db
    .select({
      fiiNetMonthly: schema.marketMonthlyFlows.fiiNetMonthly,
      diiNetMonthly: schema.marketMonthlyFlows.diiNetMonthly,
      sipMonthlyInflow: schema.marketMonthlyFlows.sipMonthlyInflow,
      yearMonth: schema.marketMonthlyFlows.yearMonth,
    })
    .from(schema.marketMonthlyFlows)
    .where(
      and(
        gte(schema.marketMonthlyFlows.yearMonth, fyStart.slice(0, 7)),
        lte(schema.marketMonthlyFlows.yearMonth, fyEnd.slice(0, 7))
      )
    );

  const fiiNetAnnual =
    fyMonthly.some((r) => r.fiiNetMonthly !== null)
      ? round2(fyMonthly.reduce((s, r) => s + (r.fiiNetMonthly ?? 0), 0))
      : null;

  const diiNetAnnual =
    fyMonthly.some((r) => r.diiNetMonthly !== null)
      ? round2(fyMonthly.reduce((s, r) => s + (r.diiNetMonthly ?? 0), 0))
      : null;

  const sipRows = fyMonthly.filter((r) => r.sipMonthlyInflow !== null);
  const sipMonthlyAvg =
    sipRows.length > 0
      ? round2(sipRows.reduce((s, r) => s + (r.sipMonthlyInflow ?? 0), 0) / sipRows.length)
      : null;

  // ── Raw from daily snapshot ─────────────────────────────────────────────────
  const niftyLevel = lastDaily.niftyLevel;
  const niftyPePublished = lastDaily.niftyPePublished;
  const niftyPb = lastDaily.niftyPb;
  const dividendYield = lastDaily.dividendYield;
  const midcapPePublished = lastDaily.midcapPePublished;
  const smallcapPePublished = lastDaily.smallcapPePublished;
  const bondYield10y = lastDaily.bondYield10y;
  const msciIndiaPe = lastDaily.msciIndiaPe;
  const msciEmPe = lastDaily.msciEmPe;

  // ── PE adjustment ───────────────────────────────────────────────────────────
  const isPostConsolidation = new Date(`${year}-03-31`) >= PE_CONSOLIDATION_DATE;

  const niftyPeStandalone =
    niftyPePublished !== null
      ? round2(niftyPePublished * (isPostConsolidation ? PE_ADJUSTMENT_FACTOR : 1))
      : null;

  const midcapPeStandalone =
    midcapPePublished !== null
      ? round2(midcapPePublished * (isPostConsolidation ? PE_ADJUSTMENT_FACTOR : 1))
      : null;

  const smallcapPeStandalone =
    smallcapPePublished !== null
      ? round2(smallcapPePublished * (isPostConsolidation ? PE_ADJUSTMENT_FACTOR : 1))
      : null;

  // ── EPS ─────────────────────────────────────────────────────────────────────
  const niftyEps =
    niftyLevel !== null && niftyPePublished !== null && niftyPePublished > 0
      ? round2(niftyLevel / niftyPePublished)
      : null;

  // ── EPS growth — look up previous year's annual row ────────────────────────
  const prevYearLabel = `Mar-${String(parseInt(year) - 1).slice(-2)}`;
  const [prevAnnual] = await db
    .select({ niftyEps: schema.marketAnnualSnapshots.niftyEps })
    .from(schema.marketAnnualSnapshots)
    .where(eq(schema.marketAnnualSnapshots.year, prevYearLabel))
    .limit(1);

  const prevEps = prevAnnual?.niftyEps ?? null;
  const epsGrowthYoy =
    niftyEps !== null && prevEps !== null && prevEps > 0
      ? round2(((niftyEps - prevEps) / prevEps) * 100)
      : null;

  // EPS 3Y CAGR
  const prev3YLabel = `Mar-${String(parseInt(year) - 3).slice(-2)}`;
  const [prev3Annual] = await db
    .select({ niftyEps: schema.marketAnnualSnapshots.niftyEps })
    .from(schema.marketAnnualSnapshots)
    .where(eq(schema.marketAnnualSnapshots.year, prev3YLabel))
    .limit(1);

  const prev3Eps = prev3Annual?.niftyEps ?? null;
  const eps3yCagr =
    niftyEps !== null && prev3Eps !== null && prev3Eps > 0
      ? round2(((niftyEps / prev3Eps) ** (1 / 3) - 1) * 100)
      : null;

  // ── ERP ─────────────────────────────────────────────────────────────────────
  const trailingEarningsYield =
    niftyPeStandalone !== null && niftyPeStandalone > 0
      ? round2((1 / niftyPeStandalone) * 100)
      : null;

  const trailingErp =
    trailingEarningsYield !== null && bondYield10y !== null
      ? round2(+(trailingEarningsYield - bondYield10y).toFixed(2))
      : null;

  // ── India vs EM ─────────────────────────────────────────────────────────────
  const indiaVsEmPremium =
    msciIndiaPe !== null && msciEmPe !== null && msciEmPe > 0
      ? round2((msciIndiaPe / msciEmPe - 1) * 100)
      : lastDaily.indiaVsEmPremium ?? null;

  // ── PE premium / discount vs median ─────────────────────────────────────────
  const PE_MEDIAN = 22.0;
  const PB_MEDIAN = 3.4;
  const DY_MEDIAN = 1.4;
  const MIDCAP_PE_MEDIAN = 26.5;
  const SMALLCAP_PE_MEDIAN = 24.5;

  const pePremiumDiscount =
    niftyPeStandalone !== null
      ? round2(((niftyPeStandalone - PE_MEDIAN) / PE_MEDIAN) * 100)
      : null;

  const midcapPremiumDiscount =
    midcapPeStandalone !== null
      ? round2(((midcapPeStandalone - MIDCAP_PE_MEDIAN) / MIDCAP_PE_MEDIAN) * 100)
      : null;

  const smallcapPremiumDiscount =
    smallcapPeStandalone !== null
      ? round2(((smallcapPeStandalone - SMALLCAP_PE_MEDIAN) / SMALLCAP_PE_MEDIAN) * 100)
      : null;

  // ── SIP growth YoY — compare with prev year's sipMonthlyAvg ────────────────
  const [prevSipAnnual] = await db
    .select({ sipMonthlyAvg: schema.marketAnnualSnapshots.sipMonthlyAvg })
    .from(schema.marketAnnualSnapshots)
    .where(eq(schema.marketAnnualSnapshots.year, prevYearLabel))
    .limit(1);

  const prevSipAvg = prevSipAnnual?.sipMonthlyAvg ?? null;
  const sipGrowthYoy =
    sipMonthlyAvg !== null && prevSipAvg !== null && prevSipAvg > 0
      ? round2(((sipMonthlyAvg - prevSipAvg) / prevSipAvg) * 100)
      : null;

  // ── Composite score ─────────────────────────────────────────────────────────
  // Forward PE and Mcap/GDP are not available from daily data — carry forward from last annual row
  const [lastAnnual] = await db
    .select({
      forwardPe: schema.marketAnnualSnapshots.forwardPe,
      mcapGdp: schema.marketAnnualSnapshots.mcapGdp,
    })
    .from(schema.marketAnnualSnapshots)
    .orderBy(desc(schema.marketAnnualSnapshots.id))
    .limit(1);

  const forwardPe = lastAnnual?.forwardPe ?? null;
  const mcapGdp = lastAnnual?.mcapGdp ?? null;

  const forwardEarningsYield =
    forwardPe !== null && forwardPe > 0
      ? round2((1 / forwardPe) * 100)
      : null;
  const forwardErp =
    forwardEarningsYield !== null && bondYield10y !== null
      ? round2(+(forwardEarningsYield - bondYield10y).toFixed(2))
      : null;

  const { score: compositeScore, zone: compositeZone } = computeCompositeScore({
    niftyPeStandalone,
    niftyPb,
    dividendYield,
    epsGrowthYoy,
    forwardPe,
    indiaVsEmPremium,
    trailingErp,
    fiiNetAnnual,
    diiNetAnnual,
    sipGrowthYoy,
    mcapGdp,
  });

  // ── Signal zones ─────────────────────────────────────────────────────────────
  const pbZone = niftyPb !== null
    ? niftyPb < 2.75 ? "Attractive" : niftyPb <= 3.4 ? "Fair" : niftyPb <= 4.5 ? "Expensive" : "Stretched"
    : null;

  const dySignal = dividendYield !== null
    ? dividendYield > 1.8 ? "Attractive" : dividendYield >= 1.3 ? "Fair-Cheap" : "Expensive"
    : null;

  const indiaVsEmSignal = indiaVsEmPremium !== null
    ? indiaVsEmPremium < 30 ? "Attractive" : indiaVsEmPremium <= 45 ? "Normal" : "Expensive"
    : null;

  const erpSignal = trailingErp !== null
    ? trailingErp > 1 ? "Attractive" : trailingErp >= -0.5 ? "Bonds Competitive" : "Danger"
    : null;

  const forwardPeZone = forwardPe !== null
    ? forwardPe < 17 ? "Attractive" : forwardPe <= 20 ? "Fair" : "Expensive"
    : null;

  const mcapGdpZone = mcapGdp !== null
    ? mcapGdp < 70 ? "Attractive" : mcapGdp <= 95 ? "Normal" : "Expensive"
    : null;

  // ── Build and upsert annual snapshot ──────────────────────────────────────
  const annualPayload: NewMarketAnnualSnapshot = {
    year: yearLabel,

    niftyLevel,
    niftyPePublished,
    niftyPeStandalone,
    niftyPeMedian: PE_MEDIAN,
    pePremiumDiscount,

    midcapPePublished,
    midcapPeStandalone,
    midcapPeMedian: MIDCAP_PE_MEDIAN,
    midcapPremiumDiscount,

    smallcapPePublished,
    smallcapPeStandalone,
    smallcapPeMedian: SMALLCAP_PE_MEDIAN,
    smallcapPremiumDiscount,

    niftyPb,
    pbMedian: PB_MEDIAN,
    pbZone,

    dividendYield,
    dyMedian: DY_MEDIAN,
    dySignal,

    niftyEps,
    epsGrowthYoy,
    eps3yCagr,

    // Forward PE and Mcap/GDP carried from last known row — update manually if needed
    forwardPe,
    forwardPeZone,
    impliedEpsGrowth: null, // set manually

    msciIndiaPe,
    msciEmPe,
    indiaVsEmPremium,
    indiaVsEmSignal,

    bondYield10y,
    trailingEarningsYield,
    forwardEarningsYield,
    trailingErp,
    forwardErp,
    erpSignal,

    fiiNet: fiiNetAnnual,
    diiNet: diiNetAnnual,
    sipMonthlyAvg,

    mcapGdp,
    mcapGdpZone,

    compositeScore,
    compositeZone,

    updatedAt: new Date().toISOString(),
  };

  await db
    .insert(schema.marketAnnualSnapshots)
    .values(annualPayload)
    .onConflictDoUpdate({
      target: schema.marketAnnualSnapshots.year,
      set: annualPayload,
    });

  console.log(`[annual] ${yearLabel} upserted — PE=${niftyPeStandalone} composite=${compositeScore} (${compositeZone})`);

  return {
    year: yearLabel,
    niftyLevel,
    niftyPeStandalone,
    niftyPb,
    bondYield10y,
    trailingErp,
    compositeScore,
    compositeZone,
    fiiNetAnnual,
    diiNetAnnual,
    sipMonthlyAvg,
    epsGrowthYoy,
    fyMonthsCovered: fyMonthly.length,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveYearMonth(raw: unknown): string | null {
  if (typeof raw === "string" && /^\d{4}-\d{2}$/.test(raw)) return raw;

  // Default to previous calendar month
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7); // "YYYY-MM"
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
