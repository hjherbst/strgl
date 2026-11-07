import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { fulfillCheckout } from "@/lib/billing/fulfill";
import { db } from "@/lib/db";
import { subscriptions, webhookEvents } from "@/lib/db/schema";
import { createId } from "@/lib/id";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe";
import { resolveTenantFromHost } from "@/lib/tenant/resolve";
import { markEntitlementGrace } from "@/lib/entitlements";
import { entitlements } from "@/lib/db/schema";
import { and } from "drizzle-orm";

export async function POST(req: Request) {
  const tenant = await resolveTenantFromHost(
    req.headers.get("x-forwarded-host") ?? req.headers.get("host"),
  );
  if (!tenant) {
    return NextResponse.json({ error: "tenant_not_found" }, { status: 400 });
  }

  const stripe = getStripe(tenant);
  const secret = getStripeWebhookSecret(tenant);
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    if (!secret || !signature) {
      // Dev fallback: parse without verify (never in production)
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "missing_secret" }, { status: 400 });
      }
      event = JSON.parse(body) as Stripe.Event;
    } else {
      event = stripe.webhooks.constructEvent(body, signature, secret);
    }
  } catch (err) {
    console.error("Stripe webhook signature error", err);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const already = await db.query.webhookEvents.findFirst({
    where: eq(webhookEvents.eventId, event.id),
  });
  if (already) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  await db.insert(webhookEvents).values({
    id: createId("wh"),
    tenantId: tenant.tenant.id,
    eventId: event.id,
    type: event.type,
  });

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const planId = session.metadata?.planId;
      if (userId && planId) {
        let periodEnd: Date | null = null;
        let stripeSubscriptionId: string | undefined;
        if (session.subscription) {
          stripeSubscriptionId = String(session.subscription);
          const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
          const end =
            "current_period_end" in sub
              ? Number((sub as { current_period_end: number }).current_period_end)
              : null;
          periodEnd = end ? new Date(end * 1000) : null;
        }
        await fulfillCheckout({
          tenant,
          userId,
          planId,
          stripeSessionId: session.id,
          stripeSubscriptionId,
          periodEnd,
        });
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const local = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.stripeSubscriptionId, sub.id),
      });
      if (local) {
        await db
          .update(subscriptions)
          .set({
            status:
              sub.status === "active"
                ? "active"
                : sub.status === "past_due"
                  ? "past_due"
                  : sub.status === "canceled"
                    ? "canceled"
                    : "incomplete",
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            currentPeriodEnd:
              "current_period_end" in sub
                ? new Date(
                    Number(
                      (sub as { current_period_end: number }).current_period_end,
                    ) * 1000,
                  )
                : null,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, local.id));
      }
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice & {
        subscription?: string | { id: string } | null;
      };
      const stripeSubId =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id;
      if (stripeSubId) {
        const local = await db.query.subscriptions.findFirst({
          where: eq(subscriptions.stripeSubscriptionId, stripeSubId),
        });
        if (local) {
          const ents = await db.query.entitlements.findMany({
            where: and(
              eq(entitlements.userId, local.userId),
              eq(entitlements.tenantId, local.tenantId),
            ),
          });
          const graceUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          for (const ent of ents) {
            if (ent.sourceId === local.id) {
              await markEntitlementGrace({
                entitlementId: ent.id,
                graceUntil,
              });
            }
          }
        }
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
