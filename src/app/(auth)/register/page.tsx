import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="mb-2 text-3xl font-semibold tracking-tight">Registrieren</h1>
      <p className="mb-8 text-muted-foreground">
        Bereits registriert?{" "}
        <Link href="/login" className="underline">
          Login
        </Link>
      </p>
      <AuthForm mode="register" />
    </div>
  );
}
