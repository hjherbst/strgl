import { Pool, neonConfig } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import ws from "ws";
import { getDatabaseUrl, listDatabaseEnvKeys } from "@/lib/db/env";
import {
  applySqlMigrations,
  listPublicTables,
  resolveDrizzleDir,
} from "@/lib/db/migrate";
import { runSeed } from "@/lib/seed";

neonConfig.webSocketConstructor = ws;

/**
 * Runtime DB setup.
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
      {
        error: "missing_database_url",
        foundKeys: listDatabaseEnvKeys(),
      },
      { status: 500 },
    );
  }

  const drizzleDir = resolveDrizzleDir();
  if (!drizzleDir) {
    return NextResponse.json(
      { error: "migrations_folder_missing" },
      { status: 500 },
    );
  }

  const pool = new Pool({ connectionString: url });

  try {
    const appliedMigrations = await applySqlMigrations(pool, drizzleDir);
    const tableNames = await listPublicTables(pool);

    if (!tableNames.includes("user")) {
      return NextResponse.json(
        {
          error: "user_table_missing_after_migrate",
          tables: tableNames,
          appliedMigrations,
          drizzleDir,
        },
        { status: 500 },
      );
    }

    const seed = await runSeed();

    return NextResponse.json({
      ok: true,
      migrated: true,
      seeded: true,
      appliedMigrations,
      tables: tableNames,
      seed,
      dbKeys: listDatabaseEnvKeys(),
    });
  } catch (error) {
    console.error("[setup]", error);
    return NextResponse.json(
      {
        error: "setup_failed",
        message: error instanceof Error ? error.message : "unknown",
        dbKeys: listDatabaseEnvKeys(),
      },
      { status: 500 },
    );
  } finally {
    await pool.end().catch(() => undefined);
  }
}
