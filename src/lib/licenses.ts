import { and, eq, isNull } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { db } from "@/lib/db";
import {
  entitlements,
  licenseActivations,
  licenses,
  plans,
  products,
} from "@/lib/db/schema";
import { createId } from "@/lib/id";

const keyPart = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 4);

export function generateLicenseKey(prefix = "STRGL") {
  return `${prefix}-${keyPart()}-${keyPart()}-${keyPart()}-${keyPart()}`;
}

export function normalizeDomain(domain: string) {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "");
}

export async function createLicense(opts: {
  tenantId: string;
  userId: string;
  productId: string;
  planId?: string | null;
  maxActivations?: number;
  prefix?: string;
}) {
  const id = createId("lic");
  const key = generateLicenseKey(opts.prefix);
  await db.insert(licenses).values({
    id,
    tenantId: opts.tenantId,
    userId: opts.userId,
    productId: opts.productId,
    planId: opts.planId ?? null,
    key,
    maxActivations: opts.maxActivations ?? 1,
    status: "active",
  });
  return { id, key };
}

export async function validateLicense(opts: {
  licenseKey: string;
  domain: string;
  activate?: boolean;
}) {
  const domain = normalizeDomain(opts.domain);
  const license = await db.query.licenses.findFirst({
    where: eq(licenses.key, opts.licenseKey.trim().toUpperCase()),
  });

  if (!license || license.status !== "active") {
    return { valid: false as const, reason: "invalid_license" };
  }

  const product = await db.query.products.findFirst({
    where: eq(products.id, license.productId),
  });
  const plan = license.planId
    ? await db.query.plans.findFirst({ where: eq(plans.id, license.planId) })
    : null;

  const entitlement = await db.query.entitlements.findFirst({
    where: and(
      eq(entitlements.tenantId, license.tenantId),
      eq(entitlements.userId, license.userId),
      eq(entitlements.productId, license.productId),
    ),
  });

  const now = new Date();
  const paid =
    entitlement &&
    (entitlement.status === "active" ||
      (entitlement.status === "grace" &&
        entitlement.graceUntil &&
        entitlement.graceUntil > now)) &&
    (!entitlement.validUntil || entitlement.validUntil > now);

  if (!paid) {
    return {
      valid: false as const,
      reason: "not_entitled",
      productSlug: product?.slug,
    };
  }

  const activations = await db.query.licenseActivations.findMany({
    where: and(
      eq(licenseActivations.licenseId, license.id),
      isNull(licenseActivations.deactivatedAt),
    ),
  });

  const existing = activations.find((a) => a.domain === domain);
  if (existing) {
    await db
      .update(licenseActivations)
      .set({ lastSeenAt: now })
      .where(eq(licenseActivations.id, existing.id));
  } else if (opts.activate !== false) {
    if (activations.length >= license.maxActivations) {
      return {
        valid: false as const,
        reason: "site_limit",
        maxSites: license.maxActivations,
        sites: activations.map((a) => a.domain),
      };
    }
    await db.insert(licenseActivations).values({
      id: createId("lact"),
      licenseId: license.id,
      domain,
    });
  }

  return {
    valid: true as const,
    productSlug: product?.slug,
    plan: plan?.name ?? null,
    maxSites: license.maxActivations,
    features: product?.features ?? [],
    grace: entitlement?.status === "grace",
    validUntil: entitlement?.validUntil ?? null,
  };
}
