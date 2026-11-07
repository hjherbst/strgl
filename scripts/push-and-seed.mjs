import { spawnSync } from "node:child_process";

function getDatabaseUrl() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.NEON_DATABASE_URL
  )?.trim();
}

const url = getDatabaseUrl();

if (!url) {
  console.error(
    "No DATABASE_URL / POSTGRES_URL available at build time.\n" +
      "In Vercel → Settings → Environment Variables: ensure the Neon DB URL is enabled for Production AND available to Build.\n" +
      "If Neon only created POSTGRES_URL, that is now supported — redeploy after confirming the var exists.",
  );
  process.exit(1);
}

// Ensure drizzle-kit always sees DATABASE_URL even if Neon named it POSTGRES_URL
process.env.DATABASE_URL = url;

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
    shell: false,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("pnpm", ["exec", "drizzle-kit", "push", "--force"]);
run("pnpm", ["exec", "tsx", "scripts/seed.ts"]);
