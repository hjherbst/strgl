import { Resend } from "resend";
import { decryptSecret } from "@/lib/crypto";
import type { ResolvedTenant } from "@/lib/tenant/resolve";

function getResend(tenant: ResolvedTenant) {
  const key =
    decryptSecret(tenant.secrets?.resendApiKeyEnc) || process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function fromAddress(tenant: ResolvedTenant) {
  const name =
    tenant.settings.mailFromName || tenant.settings.companyName || "strgl";
  const email =
    tenant.settings.mailFromEmail ||
    process.env.RESEND_FROM_EMAIL ||
    "onboarding@resend.dev";
  if (email.includes("<")) return email;
  return `${name} <${email}>`;
}

export async function sendMail(
  tenant: ResolvedTenant,
  opts: { to: string; subject: string; html: string },
) {
  const resend = getResend(tenant);
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
