import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import { getDatabaseUrl } from "./src/lib/db/env";

config({ path: ".env" });
config({ path: ".env.local" });

const url = getDatabaseUrl();

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // url optional for `generate`; required for `push`/`studio`
  dbCredentials: {
    url: url || "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
});
