"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");

    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const res = await authClient.requestPasswordReset({
        email,
        redirectTo,
      });
      if (res.error) {
        throw new Error(res.error.message || "Anfrage fehlgeschlagen");
      }
      setSent(true);
      toast.success("Falls die E-Mail existiert, wurde ein Link gesendet");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <p className="text-sm text-muted-foreground">
        Prüfe dein Postfach (und Spam). Der Link ist eine Stunde gültig.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-md flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor="email">E-Mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Senden…" : "Link zum Zurücksetzen senden"}
      </Button>
    </form>
  );
}
