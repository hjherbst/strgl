import { NextResponse } from "next/server";
import { z } from "zod";
import { getBalanceForLicense } from "@/lib/credits";

const bodySchema = z.object({
  licenseKey: z.string().min(8),
  domain: z.string().min(3),
  productSlug: z.string().optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, reason: "invalid_request" },
      { status: 400 },
    );
  }

  const result = await getBalanceForLicense(parsed.data);
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        reason: result.validation.reason,
        productSlug: "productSlug" in result.validation ? result.validation.productSlug : undefined,
      },
      { status: 403 },
    );
  }

  return NextResponse.json({
    ok: true,
    balance: result.balance,
    productSlug: result.productSlug,
    features: result.features,
    buyUrl: result.buyUrl,
    valid: true,
  });
}
