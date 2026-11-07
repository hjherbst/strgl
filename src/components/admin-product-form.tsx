"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function AdminProductForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          priceCents: Number(payload.priceCents),
          maxSites: Number(payload.maxSites || 1),
          features: String(payload.features || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fehler");
      toast.success("Produkt angelegt");
      e.currentTarget.reset();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" name="slug" required placeholder="mein-plugin" />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="description">Beschreibung</Label>
        <Textarea id="description" name="description" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="type">Typ</Label>
        <select
          id="type"
          name="type"
          className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
          defaultValue="plugin"
        >
          <option value="plugin">Plugin</option>
          <option value="webapp">Webapp</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="planName">Plan-Name</Label>
        <Input id="planName" name="planName" defaultValue="Standard" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="interval">Intervall</Label>
        <select
          id="interval"
          name="interval"
          className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
          defaultValue="year"
        >
          <option value="one_time">Einmalig</option>
          <option value="month">Monat</option>
          <option value="year">Jahr</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="priceCents">Preis (Cent, netto)</Label>
        <Input id="priceCents" name="priceCents" type="number" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="maxSites">Max. Domains</Label>
        <Input id="maxSites" name="maxSites" type="number" defaultValue={1} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="features">Features (kommagetrennt)</Label>
        <Input id="features" name="features" placeholder="pro_dashboard, api" />
      </div>
      <div>
        <Button type="submit" disabled={loading}>
          {loading ? "Anlegen…" : "Produkt + Plan anlegen"}
        </Button>
      </div>
    </form>
  );
}
