/**
 * Storyboards Runia AI stages.
 * Uses OpenAI when STORYBOARDS_OPENAI_API_KEY is set; otherwise deterministic stubs.
 */

export type AiStage =
  | "intake"
  | "story-core"
  | "expand"
  | "shotlist"
  | "edit-plan"
  | "guardrails"
  | "scene-description"
  | "scene-script"
  | "scene-image";

export type Pipeline = Record<string, unknown> & {
  schema?: string;
  version?: string;
  board_id?: number | string;
  status?: {
    stage?: string;
    complete?: boolean;
    updated_at?: string;
  };
  story_core?: Record<string, unknown>;
  shotlist?: {
    shots?: Array<Record<string, unknown>>;
    [key: string]: unknown;
  };
  edit_plan?: Record<string, unknown>;
  guardrails?: Record<string, unknown>;
};

export type AiEnvelope = {
  ok: boolean;
  stage: string;
  pipeline: Pipeline;
  credits_charged: number;
  balance: number;
  ui: {
    assistant_message: string;
    questions: Array<{ id: string; prompt: string; type?: string }>;
    suggested_actions: string[];
  };
  scene_patch?: Record<string, unknown>;
  provider: "openai" | "stub";
};

type RunOpts = {
  stage: AiStage;
  pipeline?: Pipeline | null;
  body?: Record<string, unknown>;
  boardId?: number | string;
  balanceAfter: number;
  creditsCharged: number;
};

const CORE_KEYS = [
  "situation",
  "desire",
  "conflict",
  "change",
  "result",
] as const;

function nowIso() {
  return new Date().toISOString();
}

function emptyPipeline(boardId?: number | string): Pipeline {
  return {
    schema: "storyboards.runia.pipeline",
    version: "1.0",
    board_id: boardId,
    status: { stage: "intake", complete: false, updated_at: nowIso() },
    story_core: {
      schema: "storyboards.runia.story_core",
      version: "1.0",
      source: { method: "five_line", author: "tim_runia" },
      context: {
        topic: "",
        audience: "",
        format: "",
        tone: "",
        protagonist: "",
        raw_brief: "",
        answers: [],
      },
      core: {
        situation: { text: "" },
        desire: { text: "" },
        conflict: { text: "" },
        change: { text: "" },
        result: { text: "" },
      },
      expansion: { level: 5, lines: [] },
      validation: { complete: false, missing: [], warnings: [] },
    },
    shotlist: {
      schema: "storyboards.runia.shot_language",
      version: "1.0",
      coverage_hint: "Prefer wide → medium → close for clarity.",
      shots: [],
    },
    edit_plan: {
      schema: "storyboards.runia.edit_cuts",
      version: "1.0",
      principle: "Pick the cut the moment needs.",
      cuts: [],
      pace_map: [],
    },
    guardrails: {
      schema: "storyboards.runia.production_guardrails",
      version: "1.0",
      findings: [],
    },
  };
}

function mergePipeline(
  existing: Pipeline | null | undefined,
  boardId?: number | string,
): Pipeline {
  const base = emptyPipeline(boardId);
  if (!existing || typeof existing !== "object") return base;
  return {
    ...base,
    ...existing,
    status: { ...base.status, ...(existing.status as object) },
    story_core: {
      ...(base.story_core as object),
      ...(existing.story_core as object),
    },
    shotlist: {
      ...(base.shotlist as object),
      ...(existing.shotlist as object),
    },
    edit_plan: {
      ...(base.edit_plan as object),
      ...(existing.edit_plan as object),
    },
    guardrails: {
      ...(base.guardrails as object),
      ...(existing.guardrails as object),
    },
  };
}

function contextOf(pipeline: Pipeline) {
  const sc = pipeline.story_core as Record<string, unknown> | undefined;
  return (sc?.context as Record<string, unknown>) || {};
}

function coreOf(pipeline: Pipeline) {
  const sc = pipeline.story_core as Record<string, unknown> | undefined;
  return (sc?.core as Record<string, Record<string, string>>) || {};
}

function briefText(pipeline: Pipeline, body?: Record<string, unknown>) {
  const ctx = contextOf(pipeline);
  return String(
    body?.raw_brief || ctx.raw_brief || ctx.topic || "a short personal story",
  );
}

function storyboardsOpenAiKey() {
  return process.env.STORYBOARDS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
}

function storyboardsOpenAiModel() {
  return (
    process.env.STORYBOARDS_OPENAI_MODEL ||
    process.env.OPENAI_MODEL ||
    "gpt-4o-mini"
  );
}

async function callOpenAI(system: string, user: string): Promise<string | null> {
  const key = storyboardsOpenAiKey();
  if (!key) return null;

  const model = storyboardsOpenAiModel();
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    console.error("OpenAI error", await res.text());
    return null;
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? null;
}

function envelope(
  opts: RunOpts & {
    pipeline: Pipeline;
    message: string;
    questions?: AiEnvelope["ui"]["questions"];
    actions?: string[];
    scene_patch?: Record<string, unknown>;
    provider: "openai" | "stub";
  },
): AiEnvelope {
  return {
    ok: true,
    stage: opts.stage,
    pipeline: {
      ...opts.pipeline,
      status: {
        ...(opts.pipeline.status || {}),
        stage: opts.stage,
        updated_at: nowIso(),
      },
    },
    credits_charged: opts.creditsCharged,
    balance: opts.balanceAfter,
    ui: {
      assistant_message: opts.message,
      questions: opts.questions ?? [],
      suggested_actions: opts.actions ?? [],
    },
    scene_patch: opts.scene_patch,
    provider: opts.provider,
  };
}

function stubIntake(pipeline: Pipeline, body?: Record<string, unknown>): AiEnvelope["ui"] & {
  pipeline: Pipeline;
} {
  const sc = { ...(pipeline.story_core as Record<string, unknown>) };
  const context = {
    ...(sc.context as object),
    raw_brief: String(body?.raw_brief || (sc.context as { raw_brief?: string })?.raw_brief || ""),
    answers: Array.isArray(body?.answers)
      ? body?.answers
      : (sc.context as { answers?: unknown })?.answers || [],
  };
  sc.context = context;
  pipeline.story_core = sc;

  const brief = String(context.raw_brief || "").trim();
  if (!brief || brief.length < 20) {
    return {
      pipeline,
      assistant_message:
        "Tell me what this video is about in a few sentences — who it's for and what feeling it should leave.",
      questions: [
        {
          id: "topic",
          prompt: "What is the video about?",
          type: "text",
        },
        {
          id: "audience",
          prompt: "Who is it for?",
          type: "text",
        },
      ],
      suggested_actions: ["answer_intake"],
    };
  }

  const answers = (context.answers as Array<{ id: string; answer: string }>) || [];
  const hasAudience = answers.some((a) => a.id === "audience" && a.answer?.trim());
  if (!hasAudience && !(context as { audience?: string }).audience) {
    return {
      pipeline,
      assistant_message: "Got it. Who should feel seen by this video?",
      questions: [
        {
          id: "audience",
          prompt: "Audience",
          type: "text",
        },
        {
          id: "tone",
          prompt: "Tone (e.g. honest, playful, calm)",
          type: "text",
        },
      ],
      suggested_actions: ["answer_intake", "generate_core"],
    };
  }

  const ctx = context as Record<string, unknown>;
  for (const a of answers) {
    if (a.id === "topic") ctx.topic = a.answer;
    if (a.id === "audience") ctx.audience = a.answer;
    if (a.id === "tone") ctx.tone = a.answer;
  }
  if (!ctx.topic) {
    ctx.topic = brief.slice(0, 120);
  }
  sc.context = ctx;
  pipeline.story_core = sc;

  return {
    pipeline,
    assistant_message:
      "Context looks solid. Next we lock the five-line emotional core — then generate shots in small connected batches.",
    questions: [],
    suggested_actions: ["generate_core"],
  };
}

function stubStoryCore(pipeline: Pipeline, body?: Record<string, unknown>): {
  pipeline: Pipeline;
  message: string;
  actions: string[];
} {
  const brief = briefText(pipeline, body);
  const sc = { ...(pipeline.story_core as Record<string, unknown>) };
  sc.core = {
    situation: {
      text: `We meet someone in the middle of “${brief.slice(0, 80)}”.`,
    },
    desire: { text: "They want a clear next step that feels true, not polished." },
    conflict: {
      text: "Doubt, noise, and unfinished drafts keep delaying the first honest take.",
    },
    change: {
      text: "They choose one simple story and commit to shipping it this week.",
    },
    result: {
      text: "The video becomes proof they can create from the heart — and keep going.",
    },
  };
  sc.validation = { complete: true, missing: [], warnings: [] };
  pipeline.story_core = sc;

  return {
    pipeline,
    message:
      "Here are five lines. Edit anything that feels off, then pick a beat to generate a small shot tranche.",
    actions: ["expand", "generate_shotlist", "choose_beat"],
  };
}

function stubExpand(pipeline: Pipeline, body?: Record<string, unknown>) {
  const level = Number(body?.level ?? 10);
  const core = coreOf(pipeline);
  const lines = CORE_KEYS.flatMap((key, i) => {
    const text = core[key]?.text || key;
    const items = [{ id: `l${i + 1}`, core_key: key, text }];
    if (level > 5) {
      items.push({
        id: `l${i + 1}b`,
        core_key: key,
        text: `${text} (detail: what we see or hear in this beat)`,
      });
    }
    return items;
  }).slice(0, level);

  const sc = { ...(pipeline.story_core as Record<string, unknown>) };
  sc.expansion = { level, lines };
  pipeline.story_core = sc;

  return {
    pipeline,
    message: `Expanded to ${lines.length} lines. Ready for a shot tranche.`,
    actions: ["generate_shotlist", "choose_beat"],
  };
}

function stubShotlist(pipeline: Pipeline, body?: Record<string, unknown>) {
  const scope = (body?.scope as Record<string, unknown>) || {};
  const mode = String(scope.mode || body?.mode || "tranche");
  const preferWmc = body?.prefer_wmc !== false && scope.prefer_wmc !== false;
  const maxShots = Math.min(
    9,
    Math.max(3, Number(scope.max_shots || body?.max_shots || 5)),
  );
  const requestedKeys = (scope.core_keys as string[]) || [];
  const coreKeys =
    requestedKeys.length > 0
      ? requestedKeys.filter((k): k is (typeof CORE_KEYS)[number] =>
          (CORE_KEYS as readonly string[]).includes(k),
        )
      : (["situation"] as Array<(typeof CORE_KEYS)[number]>);

  const existing = [...(pipeline.shotlist?.shots || [])];
  const startIndex = existing.length;
  const types = preferWmc
    ? (["wide", "medium", "close"] as const)
    : (["wide", "medium", "close", "ots", "pov"] as const);

  const newShots: Array<Record<string, unknown>> = [];
  let sort = startIndex;
  for (const key of coreKeys) {
    const purposeBase = coreOf(pipeline)[key]?.text || key;
    for (let i = 0; i < Math.min(3, maxShots - newShots.length); i++) {
      const shotType = types[i % types.length];
      newShots.push({
        id: `shot_${String(sort + 1).padStart(2, "0")}`,
        shot_type: shotType,
        core_key: key,
        purpose: `${shotType} for ${key}: ${String(purposeBase).slice(0, 80)}`,
        subject: key,
        suggested_duration_sec: shotType === "wide" ? 4 : shotType === "close" ? 3 : 5,
        role: shotType === "wide" ? "b_roll" : "a_roll",
        image_prompt: `${shotType} shot illustrating ${key}`,
        sort_order: sort,
        linked_scene_id: null,
        tranche_id: `tranche_${key}_${startIndex}`,
      });
      sort += 1;
      if (newShots.length >= maxShots) break;
    }
    if (newShots.length >= maxShots) break;
  }

  pipeline.shotlist = {
    ...(pipeline.shotlist || {}),
    schema: "storyboards.runia.shot_language",
    version: "1.0",
    coverage_hint: preferWmc
      ? "Prefer wide → medium → close for clarity."
      : "Mixed coverage.",
    mode,
    shots: [...existing, ...newShots],
    pending_tranche: newShots.map((s) => s.id),
  };

  return {
    pipeline,
    message: `Proposed ${newShots.length} connected shots for ${coreKeys.join(", ")}. Review, edit, then apply to the board.`,
    actions: ["apply_shotlist", "generate_shotlist", "choose_beat"],
  };
}

function stubEditPlan(pipeline: Pipeline) {
  const shots = pipeline.shotlist?.shots || [];
  const cuts = [];
  for (let i = 0; i < shots.length - 1; i++) {
    const from = shots[i];
    const to = shots[i + 1];
    cuts.push({
      from_scene_id: from.linked_scene_id ?? null,
      to_scene_id: to.linked_scene_id ?? null,
      from_shot_id: from.id,
      to_shot_id: to.id,
      cut_type: i % 2 === 0 ? "wmc" : "flow",
      emotion_intent: "smooth",
      audio_behavior: "continue",
    });
  }
  pipeline.edit_plan = {
    schema: "storyboards.runia.edit_cuts",
    version: "1.0",
    principle: "Pick the cut the moment needs.",
    cuts,
    pace_map: shots.map((s, i) => ({
      shot_id: s.id,
      pace: i === 0 ? "settle" : "move",
    })),
  };
  return {
    pipeline,
    message: "Cut suggestions added. Use them as coaching for the timeline — they do not rewrite scene order.",
    actions: ["open_timeline", "guardrails"],
  };
}

function stubGuardrails(pipeline: Pipeline) {
  const core = coreOf(pipeline);
  const missing = CORE_KEYS.filter((k) => !core[k]?.text?.trim());
  const shots = pipeline.shotlist?.shots || [];
  const findings: Array<Record<string, unknown>> = [];

  if (missing.length) {
    findings.push({
      code: "ignoring_story",
      severity: "error",
      family: "story",
      message: `Story core incomplete: ${missing.join(", ")}`,
    });
  }
  if (shots.length < 3) {
    findings.push({
      code: "not_enough_coverage",
      severity: "warn",
      family: "shoot",
      message: "Fewer than three shots — consider another W/M/C tranche.",
    });
  }
  findings.push({
    code: "watching_tutorials_instead",
    severity: "info",
    family: "process",
    message: "Ship this board. Perfect coverage can wait.",
  });

  pipeline.guardrails = {
    schema: "storyboards.runia.production_guardrails",
    version: "1.0",
    findings,
  };
  pipeline.status = {
    ...(pipeline.status || {}),
    complete: missing.length === 0 && shots.length > 0,
    stage: "done",
    updated_at: nowIso(),
  };

  return {
    pipeline,
    message:
      findings.find((f) => f.severity === "error")
        ? "Guardrails found blockers — fix the story core before shooting."
        : "Guardrails look good enough to shoot. Keep joy in the process.",
    actions: ["open_list", "choose_beat"],
  };
}

function stubScenePatch(stage: AiStage, body?: Record<string, unknown>) {
  const title = String(body?.title || "Scene");
  if (stage === "scene-description") {
    return {
      description: `${title}: clear intention, one subject, light that serves the emotion.`,
    };
  }
  if (stage === "scene-script") {
    return {
      script: `VO: ${title} — say the honest line, then pause.`,
    };
  }
  return {
    image_prompt: `Storyboard frame for “${title}”, cinematic still, soft daylight`,
  };
}

export async function runStoryboardsAi(opts: RunOpts): Promise<AiEnvelope> {
  const pipeline = mergePipeline(opts.pipeline, opts.boardId);
  const body = opts.body || {};

  // Prefer OpenAI structured generation when available for core stages.
  if (
    storyboardsOpenAiKey() &&
    (opts.stage === "intake" ||
      opts.stage === "story-core" ||
      opts.stage === "expand" ||
      opts.stage === "shotlist")
  ) {
    const system =
      "You are a storyboard assistant using Tim Runia's 5-line story method. Respond with JSON only matching the requested shape. Keep language matching the user brief.";
    const user = JSON.stringify({
      stage: opts.stage,
      pipeline,
      body,
      instructions:
        opts.stage === "shotlist"
          ? "Generate a small connected tranche (3-5 shots), prefer wide→medium→close, attach core_key."
          : undefined,
    });
    const content = await callOpenAI(system, user);
    if (content) {
      try {
        const parsed = JSON.parse(content) as {
          pipeline?: Pipeline;
          assistant_message?: string;
          questions?: AiEnvelope["ui"]["questions"];
          suggested_actions?: string[];
        };
        if (parsed.pipeline) {
          return envelope({
            ...opts,
            pipeline: mergePipeline(parsed.pipeline, opts.boardId),
            message:
              parsed.assistant_message ||
              "Updated. Review before applying to the board.",
            questions: parsed.questions,
            actions: parsed.suggested_actions,
            provider: "openai",
          });
        }
      } catch {
        // fall through to stub
      }
    }
  }

  if (opts.stage === "intake") {
    const result = stubIntake(pipeline, body);
    return envelope({
      ...opts,
      pipeline: result.pipeline,
      message: result.assistant_message,
      questions: result.questions,
      actions: result.suggested_actions,
      provider: "stub",
    });
  }

  if (opts.stage === "story-core") {
    const result = stubStoryCore(pipeline, body);
    return envelope({
      ...opts,
      pipeline: result.pipeline,
      message: result.message,
      actions: result.actions,
      provider: "stub",
    });
  }

  if (opts.stage === "expand") {
    const result = stubExpand(pipeline, body);
    return envelope({
      ...opts,
      pipeline: result.pipeline,
      message: result.message,
      actions: result.actions,
      provider: "stub",
    });
  }

  if (opts.stage === "shotlist") {
    const result = stubShotlist(pipeline, body);
    return envelope({
      ...opts,
      pipeline: result.pipeline,
      message: result.message,
      actions: result.actions,
      provider: "stub",
    });
  }

  if (opts.stage === "edit-plan") {
    const result = stubEditPlan(pipeline);
    return envelope({
      ...opts,
      pipeline: result.pipeline,
      message: result.message,
      actions: result.actions,
      provider: "stub",
    });
  }

  if (opts.stage === "guardrails") {
    const result = stubGuardrails(pipeline);
    return envelope({
      ...opts,
      pipeline: result.pipeline,
      message: result.message,
      actions: result.actions,
      provider: "stub",
    });
  }

  const patch = stubScenePatch(opts.stage, body);
  return envelope({
    ...opts,
    pipeline,
    message:
      opts.stage === "scene-image"
        ? "Image prompt ready (rendering is a later step)."
        : "Scene field draft ready — review before saving.",
    actions: [],
    scene_patch: patch,
    provider: "stub",
  });
}
