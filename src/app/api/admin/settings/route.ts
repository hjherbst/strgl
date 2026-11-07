import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tenantSettings, tenantTaxConfig } from "@/lib/db/schema";
import { createId } from "@/lib/id";
import { getRequestTenant } from "@/lib/tenant/resolve";
import { auditLogs } from "@/lib/db/schema";

const schema = z.object({
  companyName: z.string().min(1),
  managingDirector: z.string().optional(),
  addressLine1: z.string().min(1),
  postalCode: z.string().min(1),
  city: z.string().min(1),
  country: z.string().min(2),
  phone: z.string().optional(),
  supportEmail: z.string().email(),
  vatId: z.string().min(1),
  commercialRegister: z.string().optional(),
  registerCourt: z.string().optional(),
  invoicePrefix: z.string().min(1),
  brandColor: z.string().optional(),
  mailFromName: z.string().optional(),
  mailFromEmail: z.string().optional(),
  taxMode: z.enum([
    "home_vat_below_threshold",
    "oss",
    "home_b2c_only",
  ]),
  homeCountry: z.string().min(2),
  homeVatRate: z.string(),
  euB2cThresholdNet: z.coerce.number().int().positive(),
  allowNonEuCheckout: z.boolean().optional(),
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

  await db
    .update(tenantSettings)
    .set({
      companyName: d.companyName,
      managingDirector: d.managingDirector || null,
      addressLine1: d.addressLine1,
      postalCode: d.postalCode,
      city: d.city,
      country: d.country.toUpperCase(),
      phone: d.phone || null,
      supportEmail: d.supportEmail,
      vatId: d.vatId,
      commercialRegister: d.commercialRegister || null,
      registerCourt: d.registerCourt || null,
      invoicePrefix: d.invoicePrefix,
      brandColor: d.brandColor || null,
      mailFromName: d.mailFromName || null,
      mailFromEmail: d.mailFromEmail || null,
      updatedAt: new Date(),
    })
    .where(eq(tenantSettings.tenantId, tenant.tenant.id));

  await db
    .update(tenantTaxConfig)
    .set({
      taxMode: d.taxMode,
      homeCountry: d.homeCountry.toUpperCase(),
      homeVatRate: d.homeVatRate,
      euB2cThresholdNet: d.euB2cThresholdNet,
      allowNonEuCheckout: Boolean(d.allowNonEuCheckout),
      updatedAt: new Date(),
    })
    .where(eq(tenantTaxConfig.tenantId, tenant.tenant.id));

  await db.insert(auditLogs).values({
    id: createId("aud"),
    tenantId: tenant.tenant.id,
    actorUserId: session.user.id,
    action: "settings.update",
    entityType: "tenant",
    entityId: tenant.tenant.id,
  });

  return NextResponse.json({ ok: true });
}
