import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">Login</h1>
      <p className="mb-8 text-muted-foreground">
        Noch kein Konto?{" "}
        <Link href="/register" className="underline">
          Registrieren
        </Link>
        {" · "}
        <Link href="/forgot-password" className="underline">
          Passwort vergessen
        </Link>
      </p>
      <AuthForm mode="login" />
    </div>
  );
}
