import { Resend } from "resend";
import { decryptSecret } from "@/lib/crypto";
import type { ResolvedTenant } from "@/lib/tenant/resolve";

function getResend(apiKey?: string | null) {
  const key = apiKey || process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function fromAddress(tenant?: ResolvedTenant | null) {
  const name =
    tenant?.settings.mailFromName ||
    tenant?.settings.companyName ||
    "strgl";
  const email =
    tenant?.settings.mailFromEmail ||
    process.env.RESEND_FROM_EMAIL ||
    "onboarding@resend.dev";
  if (email.includes("<")) return email;
  return `${name} <${email}>`;
}

export async function sendMail(
  tenant: ResolvedTenant,
  opts: { to: string; subject: string; html: string },
) {
  const resend = getResend(
    decryptSecret(tenant.secrets?.resendApiKeyEnc),
  );
  if (!resend) {
    console.info("[mail:skipped]", opts.subject, "→", opts.to);
    return { skipped: true as const };
  }

  await resend.emails.send({
    from: fromAddress(tenant),
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
  return { skipped: false as const };
}

/** System mails (auth) without tenant context. */
export async function sendSystemMail(opts: {
  to: string;
  subject: string;
  html: string;
}) {
  const resend = getResend();
  if (!resend) {
    console.info("[mail:skipped]", opts.subject, "→", opts.to);
    console.info("[mail:reset-url-in-dev]", opts.html);
    return { skipped: true as const };
  }

  await resend.emails.send({
    from: fromAddress(null),
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
  return { skipped: false as const };
}
