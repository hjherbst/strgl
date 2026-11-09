import { Suspense } from "react";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">
        Neues Passwort
      </h1>
      <p className="mb-8 text-muted-foreground">
        <Link href="/login" className="underline">
          Zum Login
        </Link>
      </p>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Laden…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
