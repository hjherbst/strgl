import Link from "next/link";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">
        Passwort vergessen
      </h1>
      <p className="mb-8 text-muted-foreground">
        Wir senden dir einen Link zum Zurücksetzen.{" "}
        <Link href="/login" className="underline">
          Zurück zum Login
        </Link>
      </p>
      <ForgotPasswordForm />
    </div>
  );
}
