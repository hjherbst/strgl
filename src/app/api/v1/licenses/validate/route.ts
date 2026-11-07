import { NextResponse } from "next/server";
import { z } from "zod";
import { validateLicense } from "@/lib/licenses";

const bodySchema = z.object({
  licenseKey: z.string().min(8),
  domain: z.string().min(3),
  pluginVersion: z.string().optional(),
  activate: z.boolean().optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { valid: false, reason: "invalid_request" },
      { status: 400 },
    );
  }

  const result = await validateLicense(parsed.data);
  return NextResponse.json(result);
}
