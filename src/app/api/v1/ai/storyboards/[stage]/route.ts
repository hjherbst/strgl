import { NextResponse } from "next/server";
import { z } from "zod";
import { runStoryboardsAi, type AiStage } from "@/lib/ai/storyboards";
import {
  consumeCredits,
  resolveStoryboardsLicense,
  stageCost,
} from "@/lib/credits";
import { createId } from "@/lib/id";

const STAGES = new Set<AiStage>([
  "intake",
  "story-core",
  "expand",
  "shotlist",
  "edit-plan",
  "guardrails",
  "scene-description",
  "scene-script",
  "scene-image",
]);

const bodySchema = z
  .object({
    licenseKey: z.string().min(8),
    domain: z.string().min(3),
    boardId: z.union([z.number(), z.string()]).optional(),
    pipeline: z.record(z.string(), z.unknown()).optional().nullable(),
    idempotencyKey: z.string().min(8).optional(),
    // Stage-specific payload (raw_brief, answers, scope, level, title, …)
    payload: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

type RouteCtx = { params: Promise<{ stage: string }> };

export async function POST(req: Request, ctx: RouteCtx) {
  const { stage: stageParam } = await ctx.params;
  const stage = stageParam as AiStage;
  if (!STAGES.has(stage)) {
    return NextResponse.json(
      { ok: false, reason: "unknown_stage", stage: stageParam },
      { status: 404 },
    );
  }

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
      { ok: false, reason: resolved.validation.reason },
      { status: 403 },
    );
  }

  const cost = stageCost(stage);
  const idempotencyKey =
    parsed.data.idempotencyKey ||
    `ai_${stage}_${parsed.data.boardId ?? "x"}_${createId("idem")}`;

  const consumed = await consumeCredits({
    tenantId: resolved.license.tenantId,
    userId: resolved.license.userId,
    productId: resolved.license.productId,
    licenseId: resolved.license.id,
    amount: cost,
    idempotencyKey,
    reason: `ai:${stage}`,
    meta: {
      stage,
      boardId: parsed.data.boardId ?? null,
    },
  });

  if (!consumed.ok) {
    return NextResponse.json(
      {
        ok: false,
        reason: consumed.reason,
        balance: consumed.balance,
        required: consumed.required,
        buyUrl: "https://strgl.de/account",
      },
      { status: 402 },
    );
  }

  const reserved = new Set([
    "licenseKey",
    "domain",
    "boardId",
    "pipeline",
    "idempotencyKey",
    "payload",
  ]);
  const flat = Object.fromEntries(
    Object.entries(parsed.data).filter(([k]) => !reserved.has(k)),
  );

  const envelope = await runStoryboardsAi({
    stage,
    pipeline: (parsed.data.pipeline as Record<string, unknown>) || null,
    body: {
      ...flat,
      ...(parsed.data.payload || {}),
    },
    boardId: parsed.data.boardId,
    balanceAfter: consumed.wallet?.balance ?? 0,
    creditsCharged: cost,
  });

  return NextResponse.json(envelope);
}
