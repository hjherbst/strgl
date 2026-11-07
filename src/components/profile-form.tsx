"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Defaults = {
  name: string;
  companyName: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  country: string;
  vatId: string;
};

export function ProfileForm({ defaults }: { defaults: Defaults }) {
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      const res = await fetch("/api/account/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Speichern fehlgeschlagen");
      toast.success(
        data.vatIdValid === true
          ? "Gespeichert · USt-IdNr. gültig"
          : data.vatId
            ? "Gespeichert · USt-IdNr. ungültig oder nicht geprüft"
            : "Gespeichert",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      {(
        [
          ["name", "Name", defaults.name],
          ["companyName", "Firma", defaults.companyName],
          ["addressLine1", "Straße", defaults.addressLine1],
          ["addressLine2", "Adresszusatz", defaults.addressLine2],
          ["postalCode", "PLZ", defaults.postalCode],
          ["city", "Ort", defaults.city],
          ["country", "Land (ISO, z.B. DE)", defaults.country],
          ["vatId", "USt-IdNr.", defaults.vatId],
        ] as const
      ).map(([name, label, value]) => (
        <div key={name} className="space-y-2">
          <Label htmlFor={name}>{label}</Label>
          <Input id={name} name={name} defaultValue={value} />
        </div>
      ))}
      <div className="md:col-span-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Speichern…" : "Speichern"}
        </Button>
      </div>
    </form>
  );
}
