import Stripe from "stripe";
import { decryptSecret } from "@/lib/crypto";
import type { ResolvedTenant } from "@/lib/tenant/resolve";

export function getStripe(tenant: ResolvedTenant) {
  const fromTenant = decryptSecret(tenant.secrets?.stripeSecretKeyEnc);
  const key = fromTenant || process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Stripe secret key missing (tenant or STRIPE_SECRET_KEY)");
  }
  return new Stripe(key, {
    apiVersion: "2026-10-28.endive",
  });
}

export function getStripeWebhookSecret(tenant: ResolvedTenant) {
  return (
    decryptSecret(tenant.secrets?.stripeWebhookSecretEnc) ||
    process.env.STRIPE_WEBHOOK_SECRET ||
    ""
  );
}

export function getStripePublishableKey(tenant: ResolvedTenant) {
  return (
    tenant.secrets?.stripePublishableKey ||
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    ""
  );
}
