import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "../../../db";

export const dynamic = "force-dynamic";

export async function GET() {
  let db = false;
  try {
    await getDb().execute(sql`select 1`);
    db = true;
  } catch {
    db = false;
  }

  return NextResponse.json({
    ok: true,
    service: "web",
    db,
    timestamp: new Date().toISOString(),
  });
}
