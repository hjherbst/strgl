import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { CheckoutButton } from "@/components/checkout-button";
import { buttonVariants } from "@/components/ui/button";
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
import { euro } from "@/lib/money";
import { getRequestTenant } from "@/lib/tenant/resolve";
import { cn } from "@/lib/utils";

const PRODUCT_COPY: Record<
  string,
  { headline: string; body: string[]; bullets: string[] }
> = {
  storyboards: {
    headline: "Vom Beat zur Shotlist — mit KI, die dem Story folgt",
    body: [
      "Storyboards ist das WordPress-Plugin für emotionale Filmplanung nach der 5-Zeilen-Methode. Der Editor bleibt frei nutzbar; KI-Assistent und Beat-Tranches laufen über Credits.",
      "Credits kaufst du hier einmalig. Danach validiert das Plugin deine Domain-Lizenz und zieht Credits nur bei KI-Läufen ab.",
    ],
    bullets: [
      "Freier Storyboard-Editor im WordPress",
      "KI-Stufen: Intake, Story-Core, Expand, Shotlist",
      "Domain-Lizenz + Credit-Wallet über strgl",
    ],
  },
};

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let product: typeof products.$inferSelect | undefined;
  let productPlans: Array<typeof plans.$inferSelect> = [];

  try {
    const tenant = await getRequestTenant();
    product = await db.query.products.findFirst({
      where: and(
        eq(products.tenantId, tenant.tenant.id),
        eq(products.slug, slug),
        eq(products.active, true),
      ),
    });
    if (product) {
      productPlans = (
        await db.query.plans.findMany({
          where: and(
            eq(plans.tenantId, tenant.tenant.id),
            eq(plans.productId, product.id),
            eq(plans.active, true),
          ),
        })
      ).sort((a, b) => a.priceCents - b.priceCents);
    }
  } catch {
    product = undefined;
  }

  if (!product) notFound();

  const copy = PRODUCT_COPY[product.slug];

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <p className="mb-6 text-sm text-muted-foreground">
        <Link href="/products" className="underline underline-offset-4">
          Produkte
        </Link>
        <span aria-hidden> / </span>
        <span>{product.name}</span>
      </p>

      <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {product.type === "plugin" ? "WordPress-Plugin" : "Webapp"}
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
            {product.name}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            {copy?.headline || product.description}
          </p>

          <div className="mt-8 space-y-4 text-base text-foreground/90">
            {(copy?.body || [product.description].filter(Boolean)).map(
              (paragraph) => (
                <p key={paragraph} className="leading-[1.5em]">
                  {paragraph}
                </p>
              ),
            )}
          </div>

          {copy?.bullets?.length ? (
            <ul className="mt-8 space-y-2 text-sm text-muted-foreground">
              {copy.bullets.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden className="text-foreground">
                    —
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <aside className="space-y-4 lg:pt-10">
          <h2 className="text-xl font-semibold tracking-tight">Kaufoptionen</h2>
          <p className="text-sm text-muted-foreground">
            MwSt. wird je nach Land und USt-IdNr. berechnet (EU-B2B: Reverse
            Charge bei gültiger USt-IdNr.).
          </p>

          {productPlans.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aktuell keine Kaufoptionen verfügbar.
            </p>
          ) : (
            productPlans.map((plan) => (
              <Card key={plan.id}>
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>
                    {plan.interval === "one_time"
                      ? "Einmalzahlung"
                      : plan.interval === "year"
                        ? "pro Jahr"
                        : "pro Monat"}
                    {product.type === "plugin"
                      ? ` · bis ${plan.maxSites ?? 1} Domain(s)`
                      : null}
                    {plan.creditsAmount > 0
                      ? ` · ${plan.creditsAmount} Credits`
                      : null}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold">
                    {euro(plan.priceCents)}
                  </p>
                </CardContent>
                <CardFooter>
                  <CheckoutButton planId={plan.id} />
                </CardFooter>
              </Card>
            ))
          )}

          <Link
            href="/register"
            className={cn(buttonVariants({ variant: "outline" }), "w-full")}
          >
            Account erstellen
          </Link>
        </aside>
      </div>
    </div>
  );
}
