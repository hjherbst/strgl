import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import { getDatabaseUrl } from "./env";
import * as schema from "./schema";

neonConfig.webSocketConstructor = ws;

type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as {
  strglPool?: Pool;
  strglDb?: Db;
};

function createDb(): Db {
  const url = getDatabaseUrl();
  if (!url) {
    throw new Error(
      "No database URL found. Set DATABASE_URL or POSTGRES_URL (Neon/Vercel).",
    );
  }

  const pool =
    globalForDb.strglPool ??
    new Pool({
      connectionString: url,
    });
  globalForDb.strglPool = pool;

  return drizzle(pool, { schema });
}

function getDb(): Db {
  if (!globalForDb.strglDb) {
    globalForDb.strglDb = createDb();
  }
  return globalForDb.strglDb;
}

/**
 * Lazy DB accessor. Bind methods to the real drizzle instance so adapters
 * (Better Auth) don't break on Proxy `this` handling.
 */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const instance = getDb();
    const value = Reflect.get(instance as object, prop, instance);
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(instance)
      : value;
  },
});
