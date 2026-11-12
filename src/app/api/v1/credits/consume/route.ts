import { NextResponse } from "next/server";
import { z } from "zod";
import {
  consumeCredits,
  resolveStoryboardsLicense,
  stageCost,
} from "@/lib/credits";

const bodySchema = z.object({
  licenseKey: z.string().min(8),
  domain: z.string().min(3),
  amount: z.number().int().positive().optional(),
  stage: z.string().optional(),
  idempotencyKey: z.string().min(8),
  reason: z.string().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
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

  const resolved = await resolveStoryboardsLicense({
    licenseKey: parsed.data.licenseKey,
    domain: parsed.data.domain,
  });
  if (!resolved.ok) {
    return NextResponse.json(
      {
        ok: false,
        reason: resolved.validation.reason,
      },
      { status: 403 },
    );
  }

  const amount =
    parsed.data.amount ??
    (parsed.data.stage ? stageCost(parsed.data.stage) : 0);
  if (!amount) {
    return NextResponse.json(
      { ok: false, reason: "amount_or_stage_required" },
      { status: 400 },
    );
  }

  const result = await consumeCredits({
    tenantId: resolved.license.tenantId,
    userId: resolved.license.userId,
    productId: resolved.license.productId,
    licenseId: resolved.license.id,
    amount,
    idempotencyKey: parsed.data.idempotencyKey,
    reason: parsed.data.reason ?? parsed.data.stage ?? "manual_consume",
    meta: parsed.data.meta,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        reason: result.reason,
        balance: result.balance,
        required: result.required,
        buyUrl: "https://strgl.de/account",
      },
      { status: 402 },
    );
  }

  return NextResponse.json({
    ok: true,
    balance: result.wallet?.balance ?? 0,
    charged: amount,
    duplicate: result.duplicate,
  });
}
