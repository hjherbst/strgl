/**
 * Resolve Postgres URL from common Vercel/Neon env names,
 * including discrete PG* vars from some Neon integrations.
 */
export function getDatabaseUrl() {
  const direct =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.NEON_DATABASE_URL ||
    process.env.POSTGRES_DATABASE_URL ||
    process.env.STORAGE_URL;

  if (direct?.trim()) {
    return direct.trim();
  }

  const host = process.env.PGHOST || process.env.POSTGRES_HOST;
  const user = process.env.PGUSER || process.env.POSTGRES_USER;
  const password = process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD;
  const database =
    process.env.PGDATABASE ||
    process.env.POSTGRES_DATABASE ||
    process.env.POSTGRES_DB;
  const port = process.env.PGPORT || process.env.POSTGRES_PORT || "5432";

  if (host && user && password && database) {
    const encUser = encodeURIComponent(user);
    const encPass = encodeURIComponent(password);
    return `postgresql://${encUser}:${encPass}@${host}:${port}/${database}?sslmode=require`;
  }

  return undefined;
}

/** Safe list of DB-related env keys present (names only, no secrets). */
export function listDatabaseEnvKeys() {
  const candidates = [
    "DATABASE_URL",
    "DATABASE_URL_UNPOOLED",
    "POSTGRES_URL",
    "POSTGRES_PRISMA_URL",
    "POSTGRES_URL_NON_POOLING",
    "NEON_DATABASE_URL",
    "POSTGRES_DATABASE_URL",
    "STORAGE_URL",
    "PGHOST",
    "PGHOST_UNPOOLED",
    "PGUSER",
    "PGPASSWORD",
    "PGDATABASE",
    "PGPORT",
    "POSTGRES_HOST",
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "POSTGRES_DATABASE",
    "POSTGRES_DB",
    "POSTGRES_PORT",
  ];

  return candidates.filter((key) => {
    const value = process.env[key];
    return typeof value === "string" && value.length > 0;
  });
}
