import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { entitlements, products } from "@/lib/db/schema";
import { createId } from "@/lib/id";

export async function grantEntitlement(opts: {
  tenantId: string;
  userId: string;
  productId: string;
  sourceType: string;
  sourceId?: string;
  validUntil?: Date | null;
}) {
  const existing = await db.query.entitlements.findFirst({
    where: and(
      eq(entitlements.tenantId, opts.tenantId),
      eq(entitlements.userId, opts.userId),
      eq(entitlements.productId, opts.productId),
      inArray(entitlements.status, ["active", "grace"]),
    ),
  });

  if (existing) {
    await db
      .update(entitlements)
      .set({
        status: "active",
        sourceType: opts.sourceType,
        sourceId: opts.sourceId,
        validUntil: opts.validUntil ?? null,
        updatedAt: new Date(),
      })
      .where(eq(entitlements.id, existing.id));
    return existing.id;
  }

  const id = createId("ent");
  await db.insert(entitlements).values({
    id,
    tenantId: opts.tenantId,
    userId: opts.userId,
    productId: opts.productId,
    status: "active",
    sourceType: opts.sourceType,
    sourceId: opts.sourceId,
    validUntil: opts.validUntil ?? null,
  });
  return id;
}

export async function getUserEntitlementForProduct(opts: {
  tenantId: string;
  userId: string;
  productSlug: string;
}) {
  const product = await db.query.products.findFirst({
    where: and(
      eq(products.tenantId, opts.tenantId),
      eq(products.slug, opts.productSlug),
    ),
  });
  if (!product) return null;

  const entitlement = await db.query.entitlements.findFirst({
    where: and(
      eq(entitlements.tenantId, opts.tenantId),
      eq(entitlements.userId, opts.userId),
      eq(entitlements.productId, product.id),
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

  return {
    product,
    entitlement,
    paid: Boolean(paid),
    features: paid ? (product.features ?? []) : [],
  };
}

export async function markEntitlementGrace(opts: {
  entitlementId: string;
  graceUntil: Date;
}) {
  await db
    .update(entitlements)
    .set({
      status: "grace",
      graceUntil: opts.graceUntil,
      updatedAt: new Date(),
    })
    .where(eq(entitlements.id, opts.entitlementId));
}

export async function expireEntitlement(entitlementId: string) {
  await db
    .update(entitlements)
    .set({ status: "expired", updatedAt: new Date() })
    .where(eq(entitlements.id, entitlementId));
}
