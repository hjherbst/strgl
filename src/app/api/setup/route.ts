import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { NextResponse } from "next/server";
import { getDatabaseUrl } from "@/lib/db/env";
import { runSeed } from "@/lib/seed";

/**
 * Runtime DB setup (Neon URL is often unavailable at Vercel build time).
 *
 * curl -X POST https://strgl.de/api/setup \
 *   -H "Authorization: Bearer $BETTER_AUTH_SECRET"
 */
export async function POST(req: Request) {
  const expected =
    process.env.SETUP_SECRET || process.env.BETTER_AUTH_SECRET;
  const authHeader = req.headers.get("authorization");

  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = getDatabaseUrl();
  if (!url) {
    return NextResponse.json(
      { error: "missing_database_url" },
      { status: 500 },
    );
  }

  try {
    const sql = neon(url);
    const db = drizzle(sql);
    await migrate(db, { migrationsFolder: "drizzle" });
    const seed = await runSeed();
    return NextResponse.json({ ok: true, migrated: true, seeded: true, seed });
  } catch (error) {
    console.error("[setup]", error);
    return NextResponse.json(
      {
        error: "setup_failed",
        message: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 },
    );
  }
}
