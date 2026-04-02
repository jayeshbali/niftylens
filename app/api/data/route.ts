import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshots = await db
      .select()
      .from(schema.marketAnnualSnapshots)
      .orderBy(asc(schema.marketAnnualSnapshots.id));

    const lastUpdated = new Date().toISOString();

    return NextResponse.json({ snapshots, lastUpdated });
  } catch (error) {
    console.error("Error fetching snapshots:", error);
    return NextResponse.json(
      { error: "Failed to fetch market data" },
      { status: 500 }
    );
  }
}
