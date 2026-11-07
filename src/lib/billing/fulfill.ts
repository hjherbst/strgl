import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  orders,
  plans,
  products,
  subscriptions,
  tenantTaxConfig,
  user,
} from "@/lib/db/schema";
import { grantEntitlement } from "@/lib/entitlements";
import { createId } from "@/lib/id";
import { bumpEuB2cYtd, issueInvoice } from "@/lib/invoices";
import { createLicense } from "@/lib/licenses";
import { getAppUrl } from "@/lib/app-url";
import { sendMail } from "@/lib/mail";
import type { ResolvedTenant } from "@/lib/tenant/resolve";
import { decideTax } from "@/lib/tax/engine";

export async function fulfillCheckout(opts: {
  tenant: ResolvedTenant;
  userId: string;
  planId: string;
  stripeSessionId?: string;
  stripeSubscriptionId?: string;
  periodEnd?: Date | null;
}) {
  const plan = await db.query.plans.findFirst({
    where: eq(plans.id, opts.planId),
  });
  if (!plan) throw new Error("Plan not found");

  const product = await db.query.products.findFirst({
    where: eq(products.id, plan.productId),
  });
  if (!product) throw new Error("Product not found");

  const buyer = await db.query.user.findFirst({
    where: eq(user.id, opts.userId),
  });
  if (!buyer) throw new Error("User not found");

  const tax = decideTax(opts.tenant.tax, {
    buyerCountry: buyer.country ?? "DE",
    buyerVatId: buyer.vatId,
    buyerVatIdValid: buyer.vatIdValid,
    netCents: plan.priceCents,
  });

  if (tax.blocked) {
    throw new Error(tax.blockReason ?? "Checkout blocked by tax rules");
  }

  const orderId = createId("ord");
  await db.insert(orders).values({
    id: orderId,
    tenantId: opts.tenant.tenant.id,
    userId: opts.userId,
    stripeCheckoutSessionId: opts.stripeSessionId,
    status: "paid",
    amountNetCents: tax.netCents,
    amountTaxCents: tax.taxCents,
    amountGrossCents: tax.grossCents,
    taxCase: tax.taxCase,
    taxRate: tax.taxRate.toFixed(4),
  });

  let subscriptionId: string | undefined;
  if (plan.interval !== "one_time") {
    subscriptionId = createId("sub");
    await db.insert(subscriptions).values({
      id: subscriptionId,
      tenantId: opts.tenant.tenant.id,
      userId: opts.userId,
      planId: plan.id,
      stripeSubscriptionId: opts.stripeSubscriptionId,
      status: "active",
      currentPeriodEnd: opts.periodEnd ?? null,
    });
  }

  await grantEntitlement({
    tenantId: opts.tenant.tenant.id,
    userId: opts.userId,
    productId: product.id,
    sourceType: plan.interval === "one_time" ? "order" : "subscription",
    sourceId: subscriptionId ?? orderId,
    validUntil: plan.interval === "one_time" ? null : opts.periodEnd,
  });

  let licenseKey: string | undefined;
  if (product.type === "plugin") {
    const lic = await createLicense({
      tenantId: opts.tenant.tenant.id,
      userId: opts.userId,
      productId: product.id,
      planId: plan.id,
      maxActivations: plan.maxSites ?? 1,
      prefix: opts.tenant.settings.invoicePrefix,
    });
    licenseKey = lic.key;
  }

  const buyerAddress = [
    buyer.addressLine1,
    buyer.addressLine2,
    `${buyer.postalCode ?? ""} ${buyer.city ?? ""}`.trim(),
  ]
    .filter(Boolean)
    .join("\n");

  const invoice = await issueInvoice({
    tenantId: opts.tenant.tenant.id,
    userId: opts.userId,
    settings: opts.tenant.settings,
    buyerName: buyer.name,
    buyerCompany: buyer.companyName,
    buyerAddress: buyerAddress || "—",
    buyerCountry: buyer.country ?? "DE",
    buyerVatId: buyer.vatId,
    tax,
    lineItems: [
      {
        description: `${product.name} – ${plan.name}`,
        quantity: 1,
        unitNetCents: plan.priceCents,
        totalNetCents: plan.priceCents,
      },
    ],
    orderId,
    subscriptionId,
  });

  if (tax.countsTowardEuB2cThreshold) {
    await bumpEuB2cYtd(opts.tenant.tenant.id, tax.netCents);
  }

  const appUrl = await getAppUrl();
  await sendMail(opts.tenant, {
    to: buyer.email,
    subject: `Kaufbestätigung ${invoice.number}`,
    html: `<p>Hallo ${buyer.name},</p>
<p>vielen Dank für Ihren Kauf von <strong>${product.name}</strong> (${plan.name}).</p>
<p>Rechnung: <strong>${invoice.number}</strong></p>
${licenseKey ? `<p>Lizenzschlüssel: <code>${licenseKey}</code></p>` : ""}
<p>Ihr Account: <a href="${appUrl}/account">Mein Konto</a></p>`,
  });

  return { orderId, subscriptionId, invoice, licenseKey };
}

export async function cancelSubscriptionAtPeriodEnd(opts: {
  subscriptionId: string;
}) {
  await db
    .update(subscriptions)
    .set({
      cancelAtPeriodEnd: true,
      canceledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, opts.subscriptionId));
}

export async function refreshTaxConfig(tenantId: string) {
  return db.query.tenantTaxConfig.findFirst({
    where: eq(tenantTaxConfig.tenantId, tenantId),
  });
}
