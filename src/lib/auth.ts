import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

export const auth = betterAuth({
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
          const tenant = await db.query.tenants.findFirst({
            where: eq(schema.tenants.slug, "strgl"),
          });
          if (tenant) {
            await db
              .update(schema.user)
              .set({ tenantId: tenant.id, country: "DE" })
              .where(eq(schema.user.id, created.id));
          }
        },
      },
    },
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3001"],
});

export type Session = typeof auth.$Infer.Session;
