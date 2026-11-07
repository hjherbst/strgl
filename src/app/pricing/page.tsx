import { eq } from "drizzle-orm";
import { CheckoutButton } from "@/components/checkout-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { plans, products } from "@/lib/db/schema";
import { getRequestTenant } from "@/lib/tenant/resolve";

function euro(cents: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export default async function PricingPage() {
  let items: Array<{
    product: typeof products.$inferSelect;
    plan: typeof plans.$inferSelect;
  }> = [];

  try {
    const tenant = await getRequestTenant();
    const allProducts = await db.query.products.findMany({
      where: eq(products.tenantId, tenant.tenant.id),
    });
    const allPlans = await db.query.plans.findMany({
      where: eq(plans.tenantId, tenant.tenant.id),
    });
    items = allPlans
      .filter((p) => p.active)
      .map((plan) => ({
        plan,
        product: allProducts.find((pr) => pr.id === plan.productId)!,
      }))
      .filter((i) => i.product?.active);
  } catch {
    items = [];
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Preise</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Einmalzahlungen und Abos. MwSt. wird je nach Land und USt-IdNr. berechnet
        (EU-B2B: Reverse Charge bei gültiger USt-IdNr.).
      </p>

      {items.length === 0 ? (
        <p className="mt-10 text-muted-foreground">
          Noch keine Produkte. Bitte Datenbank seeden und im Admin anlegen.
        </p>
      ) : (
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map(({ product, plan }) => (
            <Card key={plan.id}>
              <CardHeader>
                <CardTitle>{product.name}</CardTitle>
                <CardDescription>{plan.name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-3xl font-semibold">{euro(plan.priceCents)}</p>
                <p className="text-sm text-muted-foreground">
                  {plan.interval === "one_time"
                    ? "Einmalzahlung"
                    : plan.interval === "year"
                      ? "pro Jahr"
                      : "pro Monat"}
                  {product.type === "plugin"
                    ? ` · bis ${plan.maxSites ?? 1} Domain(s)`
                    : null}
                </p>
                <p className="text-sm text-muted-foreground">
                  {product.description}
                </p>
              </CardContent>
              <CardFooter>
                <CheckoutButton planId={plan.id} />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
