import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import ws from "ws";
import { getDatabaseUrl, listDatabaseEnvKeys } from "@/lib/db/env";
import { runSeed } from "@/lib/seed";

neonConfig.webSocketConstructor = ws;

function resolveDrizzleDir() {
  const candidates = [
    path.join(process.cwd(), "drizzle"),
    path.join(process.cwd(), ".next", "server", "drizzle"),
    path.resolve("drizzle"),
  ];
  return candidates.find((dir) => existsSync(path.join(dir, "meta", "_journal.json")));
}

async function applySqlMigrations(pool: Pool, drizzleDir: string) {
  const files = readdirSync(drizzleDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    throw new Error(`No .sql migrations found in ${drizzleDir}`);
  }

  // Ensure migrations tracking table exists (compatible enough for re-runs)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    );
  `);

  const applied = await pool.query<{ hash: string }>(
    `SELECT hash FROM "__drizzle_migrations"`,
  );
  const appliedSet = new Set(applied.rows.map((r) => r.hash));

  const appliedNow: string[] = [];

  for (const file of files) {
    if (appliedSet.has(file)) continue;

    const sql = readFileSync(path.join(drizzleDir, file), "utf8");
    const statements = sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const statement of statements) {
      await pool.query(statement);
    }

    await pool.query(
      `INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES ($1, $2)`,
      [file, Date.now()],
    );
    appliedNow.push(file);
  }

  return appliedNow;
}

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

    const tables = await pool.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
    );
    const tableNames = tables.rows.map((r) => r.tablename);

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
