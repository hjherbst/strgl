"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const error = searchParams.get("error");
  const [loading, setLoading] = useState(false);

  if (error || !token) {
    return (
      <p className="text-sm text-muted-foreground">
        Ungültiger oder abgelaufener Link.{" "}
        <a href="/forgot-password" className="underline">
          Erneut anfordern
        </a>
      </p>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    try {
      if (newPassword.length < 8) {
        throw new Error("Mindestens 8 Zeichen");
      }
      if (newPassword !== confirmPassword) {
        throw new Error("Passwörter stimmen nicht überein");
      }
      if (!token) throw new Error("Token fehlt");

      const res = await authClient.resetPassword({
        newPassword,
        token,
      });
      if (res.error) {
        throw new Error(
          res.error.message ||
            res.error.statusText ||
            "Zurücksetzen fehlgeschlagen",
        );
      }

      toast.success("Passwort gespeichert — bitte einloggen");
      router.push("/login");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-md flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor="newPassword">Neues Passwort</Label>
        <PasswordInput
          id="newPassword"
          name="newPassword"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Wiederholen</Label>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Speichern…" : "Passwort speichern"}
      </Button>
    </form>
  );
}
