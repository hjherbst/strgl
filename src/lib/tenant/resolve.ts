import { eq, or } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import {
  tenantSecrets,
  tenantSettings,
  tenantTaxConfig,
  tenants,
  type Tenant,
  type TenantSettings,
  type TenantTaxConfig,
} from "@/lib/db/schema";

export type ResolvedTenant = {
  tenant: Tenant;
  settings: TenantSettings;
  tax: TenantTaxConfig;
  secrets: typeof tenantSecrets.$inferSelect | null;
};

export async function resolveTenantFromHost(
  host?: string | null,
): Promise<ResolvedTenant | null> {
  const h = (host ?? "").split(":")[0].toLowerCase();

  let tenant =
    h && h !== "localhost"
      ? await db.query.tenants.findFirst({
          where: or(eq(tenants.customDomain, h), eq(tenants.slug, h.split(".")[0])),
        })
      : null;

  if (!tenant) {
    tenant = await db.query.tenants.findFirst({
      where: eq(tenants.slug, "strgl"),
    });
  }

  if (!tenant || !tenant.active) return null;

  const [settings, tax, secrets] = await Promise.all([
    db.query.tenantSettings.findFirst({
      where: eq(tenantSettings.tenantId, tenant.id),
    }),
    db.query.tenantTaxConfig.findFirst({
      where: eq(tenantTaxConfig.tenantId, tenant.id),
    }),
    db.query.tenantSecrets.findFirst({
      where: eq(tenantSecrets.tenantId, tenant.id),
    }),
  ]);

  if (!settings || !tax) return null;

  return { tenant, settings, tax, secrets: secrets ?? null };
}

export async function getRequestTenant(): Promise<ResolvedTenant> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const resolved = await resolveTenantFromHost(host);
  if (!resolved) {
    throw new Error("Tenant not found. Run pnpm db:seed first.");
  }
  return resolved;
}
