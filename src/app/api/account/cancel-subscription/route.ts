import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { cancelSubscriptionAtPeriodEnd } from "@/lib/billing/fulfill";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { sendMail } from "@/lib/mail";
import { getStripe } from "@/lib/stripe";
import { getRequestTenant } from "@/lib/tenant/resolve";

const schema = z.object({
  subscriptionId: z.string().min(1),
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
  const sub = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.id, parsed.data.subscriptionId),
      eq(subscriptions.userId, session.user.id),
      eq(subscriptions.tenantId, tenant.tenant.id),
    ),
  });

  if (!sub) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (sub.stripeSubscriptionId) {
    const stripe = getStripe(tenant);
    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
  }

  await cancelSubscriptionAtPeriodEnd({ subscriptionId: sub.id });

  await sendMail(tenant, {
    to: session.user.email,
    subject: "Kündigung bestätigt",
    html: `<p>Dein Abo wurde zum Periodenende gekündigt${
      sub.currentPeriodEnd
        ? ` (${sub.currentPeriodEnd.toLocaleDateString("de-DE")})`
        : ""
    }.</p>`,
  });

  return NextResponse.json({ ok: true });
}
