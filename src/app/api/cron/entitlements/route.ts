import { and, eq, lt, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { entitlements } from "@/lib/db/schema";

/**
 * Expires grace/active entitlements past their deadlines.
 * Protect with CRON_SECRET in production (Vercel Cron).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const due = await db.query.entitlements.findMany({
    where: or(
      and(eq(entitlements.status, "grace"), lt(entitlements.graceUntil, now)),
      and(eq(entitlements.status, "active"), lt(entitlements.validUntil, now)),
    ),
  });

  for (const ent of due) {
    await db
      .update(entitlements)
      .set({ status: "expired", updatedAt: now })
      .where(eq(entitlements.id, ent.id));
  }

  return NextResponse.json({ expired: due.length });
}
