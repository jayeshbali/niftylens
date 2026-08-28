import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshots = await db
      .select()
      .from(schema.intlMarketSnapshots)
      .orderBy(asc(schema.intlMarketSnapshots.id));

    return NextResponse.json({ snapshots, lastUpdated: new Date().toISOString() });
  } catch (error) {
    console.error("Error fetching international snapshots:", error);
    return NextResponse.json({ error: "Failed to fetch international market data" }, { status: 500 });
  }
}
