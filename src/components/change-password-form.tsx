"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function ChangePasswordForm() {
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    setLoading(true);
    const form = new FormData(formEl);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    try {
      if (newPassword.length < 8) {
        throw new Error("Neues Passwort: mindestens 8 Zeichen");
      }
      if (newPassword !== confirmPassword) {
        throw new Error("Passwörter stimmen nicht überein");
      }

      const res = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (res.error) {
        throw new Error(
          res.error.message ||
            res.error.statusText ||
            "Änderung fehlgeschlagen",
        );
      }

      toast.success("Passwort geändert");
      formEl.reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-md gap-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Aktuelles Passwort</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>
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
        <Label htmlFor="confirmPassword">Neues Passwort wiederholen</Label>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Speichern…" : "Passwort ändern"}
      </Button>
    </form>
  );
}
