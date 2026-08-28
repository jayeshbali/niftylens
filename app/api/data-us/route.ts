import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshots = await db
      .select()
      .from(schema.usMarketAnnualSnapshots)
      .orderBy(asc(schema.usMarketAnnualSnapshots.id));

    const lastUpdated = new Date().toISOString();

    return NextResponse.json({ snapshots, lastUpdated });
  } catch (error) {
    console.error("Error fetching US snapshots:", error);
    return NextResponse.json(
      { error: "Failed to fetch US market data" },
      { status: 500 }
    );
  }
}
