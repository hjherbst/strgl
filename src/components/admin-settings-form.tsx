"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  settings: Record<string, string | boolean | null | undefined>;
  tax: {
    taxMode: string;
    homeCountry: string;
    homeVatRate: string;
    euB2cThresholdNet: number;
    allowNonEuCheckout: boolean;
  };
};

export function AdminSettingsForm({ settings, tax }: Props) {
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          allowNonEuCheckout: form.get("allowNonEuCheckout") === "on",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fehler");
      toast.success("Einstellungen gespeichert");
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
          ["companyName", "Firma", settings.companyName],
          ["managingDirector", "Geschäftsführer", settings.managingDirector],
          ["addressLine1", "Straße", settings.addressLine1],
          ["postalCode", "PLZ", settings.postalCode],
          ["city", "Ort", settings.city],
          ["country", "Land", settings.country],
          ["phone", "Telefon", settings.phone],
          ["supportEmail", "Support-E-Mail", settings.supportEmail],
          ["vatId", "USt-IdNr.", settings.vatId],
          ["commercialRegister", "Handelsregister", settings.commercialRegister],
          ["registerCourt", "Registergericht", settings.registerCourt],
          ["invoicePrefix", "Rechnungspräfix", settings.invoicePrefix],
          ["brandColor", "Markenfarbe", settings.brandColor],
          ["mailFromName", "Mail From Name", settings.mailFromName],
          ["mailFromEmail", "Mail From Email", settings.mailFromEmail],
        ] as const
      ).map(([name, label, value]) => (
        <div key={name} className="space-y-2">
          <Label htmlFor={name}>{label}</Label>
          <Input
            id={name}
            name={name}
            defaultValue={value != null ? String(value) : ""}
          />
        </div>
      ))}

      <div className="space-y-2">
        <Label htmlFor="taxMode">Tax-Mode</Label>
        <select
          id="taxMode"
          name="taxMode"
          defaultValue={tax.taxMode}
          className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
        >
          <option value="home_vat_below_threshold">
            Heimat-MwSt. (unter OSS-Schwelle)
          </option>
          <option value="oss">OSS (Zielland)</option>
          <option value="home_b2c_only">B2C nur Heimatland</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="homeCountry">Heimatland</Label>
        <Input
          id="homeCountry"
          name="homeCountry"
          defaultValue={tax.homeCountry}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="homeVatRate">MwSt.-Satz (z.B. 0.19)</Label>
        <Input
          id="homeVatRate"
          name="homeVatRate"
          defaultValue={tax.homeVatRate}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="euB2cThresholdNet">EU-B2C Schwelle (Netto €)</Label>
        <Input
          id="euB2cThresholdNet"
          name="euB2cThresholdNet"
          type="number"
          defaultValue={tax.euB2cThresholdNet}
        />
      </div>

      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <input
          type="checkbox"
          name="allowNonEuCheckout"
          defaultChecked={tax.allowNonEuCheckout}
        />
        Checkout außerhalb der EU erlauben
      </label>

      <div className="md:col-span-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Speichern…" : "Speichern"}
        </Button>
      </div>
    </form>
  );
}
