import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  creditLedger,
  creditWallets,
  licenses,
  products,
} from "@/lib/db/schema";
import { createId } from "@/lib/id";
import { validateLicense } from "@/lib/licenses";

export const STORYBOARDS_PRODUCT_SLUG = "storyboards";

/** Credit cost per AI stage. */
export const AI_STAGE_COSTS: Record<string, number> = {
  intake: 1,
  "story-core": 2,
  expand: 2,
  shotlist: 5,
  "edit-plan": 3,
  guardrails: 1,
  "scene-description": 1,
  "scene-script": 1,
  "scene-image": 10,
};

export function stageCost(stage: string): number {
  return AI_STAGE_COSTS[stage] ?? 2;
}

export async function getOrCreateWallet(opts: {
  tenantId: string;
  userId: string;
  productId: string;
  licenseId?: string | null;
}) {
  const existing = await db.query.creditWallets.findFirst({
    where: and(
      eq(creditWallets.userId, opts.userId),
      eq(creditWallets.productId, opts.productId),
    ),
  });

  if (existing) {
    if (opts.licenseId && !existing.licenseId) {
      await db
        .update(creditWallets)
        .set({ licenseId: opts.licenseId, updatedAt: new Date() })
        .where(eq(creditWallets.id, existing.id));
      return { ...existing, licenseId: opts.licenseId };
    }
    return existing;
  }

  const id = createId("cwal");
  await db.insert(creditWallets).values({
    id,
    tenantId: opts.tenantId,
    userId: opts.userId,
    productId: opts.productId,
    licenseId: opts.licenseId ?? null,
    balance: 0,
  });

  const wallet = await db.query.creditWallets.findFirst({
    where: eq(creditWallets.id, id),
  });
  if (!wallet) throw new Error("Failed to create credit wallet");
  return wallet;
}

export async function creditWallet(opts: {
  tenantId: string;
  userId: string;
  productId: string;
  licenseId?: string | null;
  amount: number;
  type: "purchase" | "refund" | "grant" | "adjust";
  idempotencyKey: string;
  reason?: string;
  meta?: Record<string, unknown>;
}) {
  if (opts.amount <= 0) {
    throw new Error("Credit amount must be positive");
  }

  const existingLedger = await db.query.creditLedger.findFirst({
    where: eq(creditLedger.idempotencyKey, opts.idempotencyKey),
  });
  if (existingLedger) {
    const wallet = await db.query.creditWallets.findFirst({
      where: eq(creditWallets.id, existingLedger.walletId),
    });
    return {
      wallet,
      ledger: existingLedger,
      duplicate: true as const,
    };
  }

  const wallet = await getOrCreateWallet({
    tenantId: opts.tenantId,
    userId: opts.userId,
    productId: opts.productId,
    licenseId: opts.licenseId,
  });

  const balanceAfter = wallet.balance + opts.amount;
  await db
    .update(creditWallets)
    .set({ balance: balanceAfter, updatedAt: new Date() })
    .where(eq(creditWallets.id, wallet.id));

  const ledgerId = createId("cled");
  await db.insert(creditLedger).values({
    id: ledgerId,
    tenantId: opts.tenantId,
    walletId: wallet.id,
    type: opts.type,
    amount: opts.amount,
    balanceAfter,
    idempotencyKey: opts.idempotencyKey,
    reason: opts.reason ?? null,
    meta: opts.meta ?? null,
  });

  const ledger = await db.query.creditLedger.findFirst({
    where: eq(creditLedger.id, ledgerId),
  });

  return {
    wallet: { ...wallet, balance: balanceAfter },
    ledger,
    duplicate: false as const,
  };
}

export async function consumeCredits(opts: {
  tenantId: string;
  userId: string;
  productId: string;
  licenseId?: string | null;
  amount: number;
  idempotencyKey: string;
  reason?: string;
  meta?: Record<string, unknown>;
}) {
  if (opts.amount <= 0) {
    throw new Error("Consume amount must be positive");
  }

  const existingLedger = await db.query.creditLedger.findFirst({
    where: eq(creditLedger.idempotencyKey, opts.idempotencyKey),
  });
  if (existingLedger) {
    const wallet = await db.query.creditWallets.findFirst({
      where: eq(creditWallets.id, existingLedger.walletId),
    });
    return {
      ok: true as const,
      wallet,
      ledger: existingLedger,
      duplicate: true as const,
    };
  }

  const wallet = await getOrCreateWallet({
    tenantId: opts.tenantId,
    userId: opts.userId,
    productId: opts.productId,
    licenseId: opts.licenseId,
  });

  if (wallet.balance < opts.amount) {
    return {
      ok: false as const,
      reason: "insufficient_credits" as const,
      balance: wallet.balance,
      required: opts.amount,
    };
  }

  // Atomic decrement with balance guard.
  const updated = await db
    .update(creditWallets)
    .set({
      balance: sql`${creditWallets.balance} - ${opts.amount}`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(creditWallets.id, wallet.id),
        sql`${creditWallets.balance} >= ${opts.amount}`,
      ),
    )
    .returning();

  if (!updated.length) {
    const fresh = await db.query.creditWallets.findFirst({
      where: eq(creditWallets.id, wallet.id),
    });
    return {
      ok: false as const,
      reason: "insufficient_credits" as const,
      balance: fresh?.balance ?? 0,
      required: opts.amount,
    };
  }

  const balanceAfter = updated[0].balance;
  const ledgerId = createId("cled");
  await db.insert(creditLedger).values({
    id: ledgerId,
    tenantId: opts.tenantId,
    walletId: wallet.id,
    type: "consume",
    amount: -opts.amount,
    balanceAfter,
    idempotencyKey: opts.idempotencyKey,
    reason: opts.reason ?? null,
    meta: opts.meta ?? null,
  });

  const ledger = await db.query.creditLedger.findFirst({
    where: eq(creditLedger.id, ledgerId),
  });

  return {
    ok: true as const,
    wallet: updated[0],
    ledger,
    duplicate: false as const,
  };
}

export async function getBalanceForLicense(opts: {
  licenseKey: string;
  domain: string;
  productSlug?: string;
}) {
  const validation = await validateLicense({
    licenseKey: opts.licenseKey,
    domain: opts.domain,
    activate: false,
  });

  if (!validation.valid) {
    return { ok: false as const, validation };
  }

  const productSlug = opts.productSlug ?? validation.productSlug;
  if (productSlug !== STORYBOARDS_PRODUCT_SLUG) {
    return {
      ok: false as const,
      validation: {
        valid: false as const,
        reason: "wrong_product",
        productSlug,
      },
    };
  }

  const license = await db.query.licenses.findFirst({
    where: eq(licenses.key, opts.licenseKey.trim().toUpperCase()),
  });
  if (!license) {
    return {
      ok: false as const,
      validation: { valid: false as const, reason: "invalid_license" },
    };
  }

  const product = await db.query.products.findFirst({
    where: eq(products.id, license.productId),
  });

  const wallet = await getOrCreateWallet({
    tenantId: license.tenantId,
    userId: license.userId,
    productId: license.productId,
    licenseId: license.id,
  });

  return {
    ok: true as const,
    validation,
    balance: wallet.balance,
    productSlug: product?.slug ?? STORYBOARDS_PRODUCT_SLUG,
    features: product?.features ?? [],
    buyUrl: "https://strgl.de/account",
  };
}

export async function resolveStoryboardsLicense(opts: {
  licenseKey: string;
  domain: string;
}) {
  const validation = await validateLicense({
    licenseKey: opts.licenseKey,
    domain: opts.domain,
    activate: true,
  });

  if (!validation.valid) {
    return { ok: false as const, validation };
  }

  if (validation.productSlug !== STORYBOARDS_PRODUCT_SLUG) {
    return {
      ok: false as const,
      validation: {
        valid: false as const,
        reason: "wrong_product",
        productSlug: validation.productSlug,
      },
    };
  }

  const license = await db.query.licenses.findFirst({
    where: eq(licenses.key, opts.licenseKey.trim().toUpperCase()),
  });
  if (!license) {
    return {
      ok: false as const,
      validation: { valid: false as const, reason: "invalid_license" },
    };
  }

  const wallet = await getOrCreateWallet({
    tenantId: license.tenantId,
    userId: license.userId,
    productId: license.productId,
    licenseId: license.id,
  });

  return {
    ok: true as const,
    validation,
    license,
    wallet,
  };
}
