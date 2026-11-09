import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { Pool } from "@neondatabase/serverless";

export function resolveDrizzleDir() {
  const candidates = [
    path.join(process.cwd(), "drizzle"),
    path.resolve("drizzle"),
  ];
  return candidates.find((dir) =>
    existsSync(path.join(dir, "meta", "_journal.json")),
  );
}

export async function applySqlMigrations(pool: Pool, drizzleDir: string) {
  const files = readdirSync(drizzleDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    throw new Error(`No .sql migrations found in ${drizzleDir}`);
  }

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

export async function listPublicTables(pool: Pool) {
  const tables = await pool.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
  );
  return tables.rows.map((r) => r.tablename);
}
