import { headers } from "next/headers";

/**
 * Absolute app URL for server-side redirects/emails.
 * Prefer BETTER_AUTH_URL / NEXT_PUBLIC_APP_URL; otherwise derive from request host.
 */
export async function getAppUrl() {
  const fromEnv =
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL;

  if (fromEnv) {
    return fromEnv.startsWith("http") ? fromEnv.replace(/\/$/, "") : `https://${fromEnv}`;
  }

  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "https";
    if (host) return `${proto}://${host}`;
  } catch {
    // outside request context
  }

  return "http://localhost:3001";
}
