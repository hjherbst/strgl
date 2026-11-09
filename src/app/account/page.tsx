import Link from "next/link";
import { and, eq, desc } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { requireSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import {
  entitlements,
  invoices,
  licenses,
  products,
  subscriptions,
} from "@/lib/db/schema";
import { getRequestTenant } from "@/lib/tenant/resolve";
import { cn } from "@/lib/utils";
import { CancelSubscriptionButton } from "@/components/cancel-subscription-button";
import { ChangePasswordForm } from "@/components/change-password-form";
import { ProfileForm } from "@/components/profile-form";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AccountPage() {
  const session = await requireSession();
  const tenant = await getRequestTenant();
  const userId = session.user.id;

  const [ents, subs, lic, invs, prods] = await Promise.all([
    db.query.entitlements.findMany({
      where: and(
        eq(entitlements.tenantId, tenant.tenant.id),
        eq(entitlements.userId, userId),
      ),
    }),
    db.query.subscriptions.findMany({
      where: and(
        eq(subscriptions.tenantId, tenant.tenant.id),
        eq(subscriptions.userId, userId),
      ),
    }),
    db.query.licenses.findMany({
      where: and(
        eq(licenses.tenantId, tenant.tenant.id),
        eq(licenses.userId, userId),
      ),
    }),
    db.query.invoices.findMany({
      where: and(
        eq(invoices.tenantId, tenant.tenant.id),
        eq(invoices.userId, userId),
      ),
      orderBy: [desc(invoices.issuedAt)],
    }),
    db.query.products.findMany({
      where: eq(products.tenantId, tenant.tenant.id),
    }),
  ]);

  const productName = (id: string) =>
    prods.find((p) => p.id === id)?.name ?? id;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Mein Konto</h1>
          <p className="text-muted-foreground">{session.user.email}</p>
        </div>
        <SignOutButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stammdaten</CardTitle>
          <CardDescription>
            Adresse und USt-IdNr. für korrekte MwSt. und Rechnungen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            defaults={{
              name: session.user.name ?? "",
              companyName: session.user.companyName ?? "",
              addressLine1: session.user.addressLine1 ?? "",
              addressLine2: session.user.addressLine2 ?? "",
              postalCode: session.user.postalCode ?? "",
              city: session.user.city ?? "",
              country: session.user.country ?? "DE",
              vatId: session.user.vatId ?? "",
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Passwort ändern</CardTitle>
          <CardDescription>
            Andere Sitzungen werden nach dem Ändern abgemeldet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Produkte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {ents.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Noch keine Produkte.{" "}
              <Link href="/pricing" className="underline">
                Jetzt buchen
              </Link>
            </p>
          )}
          {ents.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between rounded-lg border px-3 py-2"
            >
              <div>
                <p className="font-medium">{productName(e.productId)}</p>
                <p className="text-xs text-muted-foreground">
                  {e.validUntil
                    ? `gültig bis ${e.validUntil.toLocaleDateString("de-DE")}`
                    : "ohne Ablauf"}
                </p>
              </div>
              <Badge variant={e.status === "active" ? "default" : "secondary"}>
                {e.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Abos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {subs.length === 0 && (
            <p className="text-sm text-muted-foreground">Keine Abos.</p>
          )}
          {subs.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2"
            >
              <div>
                <p className="font-medium">{s.status}</p>
                <p className="text-xs text-muted-foreground">
                  {s.currentPeriodEnd
                    ? `Periode bis ${s.currentPeriodEnd.toLocaleDateString("de-DE")}`
                    : null}
                  {s.cancelAtPeriodEnd ? " · Kündigung vorgemerkt" : null}
                </p>
              </div>
              {s.status === "active" && !s.cancelAtPeriodEnd && (
                <CancelSubscriptionButton subscriptionId={s.id} />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lizenzen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {lic.length === 0 && (
            <p className="text-sm text-muted-foreground">Keine Lizenzen.</p>
          )}
          {lic.map((l) => (
            <div key={l.id} className="rounded-lg border px-3 py-2">
              <p className="font-medium">{productName(l.productId)}</p>
              <code className="text-sm">{l.key}</code>
              <p className="text-xs text-muted-foreground">
                max. {l.maxActivations} Domain(s)
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rechnungen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {invs.length === 0 && (
            <p className="text-sm text-muted-foreground">Keine Rechnungen.</p>
          )}
          {invs.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between rounded-lg border px-3 py-2"
            >
              <div>
                <p className="font-medium">{inv.number}</p>
                <p className="text-xs text-muted-foreground">
                  {inv.issuedAt.toLocaleDateString("de-DE")} ·{" "}
                  {(inv.amountGrossCents / 100).toFixed(2)} €
                </p>
              </div>
              <Link
                href={`/api/invoices/${inv.id}/pdf`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                PDF
              </Link>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
