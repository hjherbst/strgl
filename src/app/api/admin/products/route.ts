import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { plans, products } from "@/lib/db/schema";
import { createId } from "@/lib/id";
import { getRequestTenant } from "@/lib/tenant/resolve";

const schema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["plugin", "webapp"]),
  planName: z.string().min(1),
  interval: z.enum(["one_time", "month", "year"]),
  priceCents: z.number().int().positive(),
  maxSites: z.number().int().positive().optional(),
  features: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (
    !session ||
    (session.user.role !== "admin" && session.user.role !== "platform_admin")
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const tenant = await getRequestTenant();
  const d = parsed.data;
  const productId = createId("prod");
  const planId = createId("plan");

  await db.insert(products).values({
    id: productId,
    tenantId: tenant.tenant.id,
    slug: d.slug,
    name: d.name,
    description: d.description,
    type: d.type,
    features: d.features ?? [],
    active: true,
  });

  await db.insert(plans).values({
    id: planId,
    tenantId: tenant.tenant.id,
    productId,
    name: d.planName,
    interval: d.interval,
    priceCents: d.priceCents,
    maxSites: d.maxSites ?? 1,
    active: true,
  });

  return NextResponse.json({ ok: true, productId, planId });
}
