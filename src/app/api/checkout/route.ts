import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { plans, products, user } from "@/lib/db/schema";
import { getAppUrl } from "@/lib/app-url";
import { getStripe } from "@/lib/stripe";
import { decideTax } from "@/lib/tax/engine";
import { getRequestTenant } from "@/lib/tenant/resolve";

const schema = z.object({
  planId: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const tenant = await getRequestTenant();
  const plan = await db.query.plans.findFirst({
    where: eq(plans.id, parsed.data.planId),
  });
  if (!plan || plan.tenantId !== tenant.tenant.id || !plan.active) {
    return NextResponse.json({ error: "plan_not_found" }, { status: 404 });
  }

  const buyer = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
  });
  if (!buyer) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  const tax = decideTax(tenant.tax, {
    buyerCountry: buyer.country ?? "DE",
    buyerVatId: buyer.vatId,
    buyerVatIdValid: buyer.vatIdValid,
    netCents: plan.priceCents,
  });

  if (tax.blocked) {
    return NextResponse.json(
      { error: "tax_blocked", message: tax.blockReason },
      { status: 400 },
    );
  }

  const product = await db.query.products.findFirst({
    where: eq(products.id, plan.productId),
  });

  const stripe = getStripe(tenant);
  const appUrl = await getAppUrl();
  const cancelPath = product?.slug
    ? `/products/${product.slug}?checkout=cancel`
    : "/products?checkout=cancel";

  let customerId = buyer.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: buyer.email,
      name: buyer.name,
      metadata: {
        userId: buyer.id,
        tenantId: tenant.tenant.id,
      },
    });
    customerId = customer.id;
    await db
      .update(user)
      .set({ stripeCustomerId: customerId })
      .where(eq(user.id, buyer.id));
  }

  const mode = plan.interval === "one_time" ? "payment" : "subscription";

  const lineItem = plan.stripePriceId
    ? { price: plan.stripePriceId, quantity: 1 }
    : {
        price_data: {
          currency: plan.currency,
          unit_amount: tax.grossCents,
          product_data: {
            name: plan.name,
            metadata: { planId: plan.id },
          },
          ...(mode === "subscription"
            ? {
                recurring: {
                  interval: plan.interval === "year" ? "year" : "month",
                },
              }
            : {}),
        },
        quantity: 1,
      };

  const checkout = await stripe.checkout.sessions.create({
    mode,
    customer: customerId,
    line_items: [lineItem],
    success_url: `${appUrl}/account?checkout=success`,
    cancel_url: `${appUrl}${cancelPath}`,
    metadata: {
      tenantId: tenant.tenant.id,
      userId: buyer.id,
      planId: plan.id,
      taxCase: tax.taxCase,
    },
    subscription_data:
      mode === "subscription"
        ? {
            metadata: {
              tenantId: tenant.tenant.id,
              userId: buyer.id,
              planId: plan.id,
            },
          }
        : undefined,
  });

  return NextResponse.json({ url: checkout.url });
}
