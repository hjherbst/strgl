import { NextResponse } from "next/server";
import { getDatabaseUrl, listDatabaseEnvKeys } from "@/lib/db/env";

/**
 * Shows which DB env keys exist (names only).
 * curl -H "Authorization: Bearer $BETTER_AUTH_SECRET" https://strgl.de/api/debug/db
 */
export async function GET(req: Request) {
  const expected =
    process.env.SETUP_SECRET || process.env.BETTER_AUTH_SECRET;
  const authHeader = req.headers.get("authorization");

  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const keys = listDatabaseEnvKeys();
  const url = getDatabaseUrl();

  return NextResponse.json({
    foundKeys: keys,
    resolvedUrl: Boolean(url),
    hint: url
      ? "DB URL resolved — signup should work after redeploy/restart."
      : "No DB URL resolved. In Vercel add DATABASE_URL from the Neon dashboard connection string (Production).",
  });
}
