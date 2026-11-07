import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

const appUrl =
  process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  "http://localhost:3001";

export const auth = betterAuth({
  baseURL: appUrl,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "customer",
        input: false,
      },
      tenantId: {
        type: "string",
        required: false,
        input: false,
      },
      companyName: { type: "string", required: false },
      addressLine1: { type: "string", required: false },
      addressLine2: { type: "string", required: false },
      city: { type: "string", required: false },
      postalCode: { type: "string", required: false },
      country: { type: "string", required: false, defaultValue: "DE" },
      vatId: { type: "string", required: false },
      vatIdValid: { type: "boolean", required: false },
      stripeCustomerId: { type: "string", required: false, input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (created) => {
          try {
            const tenant = await db.query.tenants.findFirst({
              where: eq(schema.tenants.slug, "strgl"),
            });
            if (!tenant) return;

            const isAdminSeed =
              process.env.SEED_ADMIN_EMAIL &&
              created.email.toLowerCase() ===
                process.env.SEED_ADMIN_EMAIL.toLowerCase();

            await db
              .update(schema.user)
              .set({
                tenantId: tenant.id,
                country: "DE",
                ...(isAdminSeed ? { role: "admin" as const } : {}),
              })
              .where(eq(schema.user.id, created.id));
          } catch (error) {
            console.error("[auth] post-create hook failed", error);
          }
        },
      },
    },
  },
  trustedOrigins: [appUrl, "https://strgl.de", "http://localhost:3001"],
});

export type Session = typeof auth.$Infer.Session;
