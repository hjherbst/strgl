import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserEntitlementForProduct } from "@/lib/entitlements";
import { getRequestTenant } from "@/lib/tenant/resolve";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ productSlug: string }> },
) {
  const { productSlug } = await ctx.params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const tenant = await getRequestTenant();
  const result = await getUserEntitlementForProduct({
    tenantId: tenant.tenant.id,
    userId: session.user.id,
    productSlug,
  });

  if (!result) {
    return NextResponse.json({ error: "product_not_found" }, { status: 404 });
  }

  return NextResponse.json({
    product: result.product.slug,
    paid: result.paid,
    features: result.features,
    status: result.entitlement?.status ?? "none",
    validUntil: result.entitlement?.validUntil ?? null,
  });
}
