import { eq, sql } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import {
  invoices,
  products,
  subscriptions,
  user,
} from "@/lib/db/schema";
import { getRequestTenant } from "@/lib/tenant/resolve";

export default async function AdminHomePage() {
  const tenant = await getRequestTenant();
  const tid = tenant.tenant.id;

  const [customerCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(user)
    .where(eq(user.tenantId, tid));

  const [productCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(eq(products.tenantId, tid));

  const [subCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(subscriptions)
    .where(eq(subscriptions.tenantId, tid));

  const [invoiceCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(invoices)
    .where(eq(invoices.tenantId, tid));

  const ytd = tenant.tax.euB2cYtdNetCents / 100;
  const threshold = tenant.tax.euB2cThresholdNet;
  const pct = Math.min(100, Math.round((ytd / threshold) * 100));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Übersicht</h1>
        <p className="text-muted-foreground">
          Tenant <code>{tenant.tenant.slug}</code> · Tax-Mode{" "}
          <code>{tenant.tax.taxMode}</code>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Kunden", customerCount?.count ?? 0],
          ["Produkte", productCount?.count ?? 0],
          ["Abos", subCount?.count ?? 0],
          ["Rechnungen", invoiceCount?.count ?? 0],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <CardHeader className="pb-2">
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-3xl">{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>EU-B2C Schwelle</CardTitle>
          <CardDescription>
            YTD Netto {ytd.toFixed(2)} € von {threshold.toLocaleString("de-DE")} €
            ({pct}%). Bei Überschreitung OSS-Mode in Firma & Tax aktivieren.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-teal-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
