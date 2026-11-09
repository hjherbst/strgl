import { redirect } from "next/navigation";

/** Compatibility for links like /reset-password/<token>. */
export default async function ResetPasswordTokenPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const error = typeof query.error === "string" ? query.error : undefined;
  const qs = new URLSearchParams();
  if (token) qs.set("token", token);
  if (error) qs.set("error", error);
  redirect(`/reset-password?${qs.toString()}`);
}
