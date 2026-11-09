import "dotenv/config";
import { config } from "dotenv";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { getDatabaseUrl, listDatabaseEnvKeys } from "../src/lib/db/env";
import {
  applySqlMigrations,
  listPublicTables,
  resolveDrizzleDir,
} from "../src/lib/db/migrate";
import { runSeed } from "../src/lib/seed";

config({ path: ".env.local" });
config({ path: ".env" });

neonConfig.webSocketConstructor = ws;

async function main() {
  const url = getDatabaseUrl();
  if (!url) {
    console.error("No DB URL found. Present keys:", listDatabaseEnvKeys());
    console.error(
      "Put STRGL_DATABASE_URL or DATABASE_URL into .env.local (from Vercel/Neon).",
    );
    process.exit(1);
  }

  const drizzleDir = resolveDrizzleDir();
  if (!drizzleDir) {
    console.error("drizzle/ folder with migrations not found");
    process.exit(1);
  }

  console.log("Using DB URL host:", new URL(url).host);
  console.log("Migrations from:", drizzleDir);

  const pool = new Pool({ connectionString: url });
  try {
    const applied = await applySqlMigrations(pool, drizzleDir);
    console.log("Applied migrations:", applied.length ? applied : "(none new)");

    const tables = await listPublicTables(pool);
    console.log("Tables:", tables.join(", ") || "(none)");

    if (!tables.includes("user")) {
      throw new Error('Table "user" still missing after migrations');
    }
  } finally {
    await pool.end().catch(() => undefined);
  }

  const seed = await runSeed();
  console.log("Seed:", seed);
  console.log("DB setup complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
