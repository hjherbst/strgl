import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { isEuCountry, normalizeVatId } from "@/lib/eu";
import { validateVatId } from "@/lib/tax/vies";

const schema = z.object({
  name: z.string().min(1),
  companyName: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  country: z.string().min(2).max(2),
  vatId: z.string().optional(),
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

  const data = parsed.data;
  let vatId: string | null = data.vatId ? normalizeVatId(data.vatId) : null;
  let vatIdValid: boolean | null = null;
  let vatIdValidatedAt: Date | null = null;

  if (vatId && isEuCountry(data.country.toUpperCase())) {
    const vies = await validateVatId(vatId);
    vatIdValid = vies.valid;
    vatIdValidatedAt = new Date();
  } else if (!vatId) {
    vatId = null;
    vatIdValid = null;
  }

  await db
    .update(user)
    .set({
      name: data.name,
      companyName: data.companyName || null,
      addressLine1: data.addressLine1 || null,
      addressLine2: data.addressLine2 || null,
      postalCode: data.postalCode || null,
      city: data.city || null,
      country: data.country.toUpperCase(),
      vatId,
      vatIdValid,
      vatIdValidatedAt,
      updatedAt: new Date(),
    })
    .where(eq(user.id, session.user.id));

  return NextResponse.json({ ok: true, vatId, vatIdValid });
}
