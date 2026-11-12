import Link from "next/link";
import { eq } from "drizzle-orm";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { getRequestTenant } from "@/lib/tenant/resolve";
import { cn } from "@/lib/utils";

function typeLabel(type: string) {
  return type === "plugin" ? "WordPress-Plugin" : "Webapp";
}

export default async function ProductsPage() {
  let catalog: Array<typeof products.$inferSelect> = [];

  try {
    const tenant = await getRequestTenant();
    const rows = await db.query.products.findMany({
      where: eq(products.tenantId, tenant.tenant.id),
    });
    catalog = rows
      .filter((p) => p.active)
      .sort((a, b) => {
        if (a.slug === "storyboards") return -1;
        if (b.slug === "storyboards") return 1;
        return a.name.localeCompare(b.name, "de");
      });
  } catch {
    catalog = [];
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Produkte</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Digitale Tools von Tidenhub Digital — Lizenzen und Credits über einen
        gemeinsamen Account.
      </p>

      {catalog.length === 0 ? (
        <p className="mt-10 text-muted-foreground">
          Noch keine Produkte. Bitte Datenbank seeden und im Admin anlegen.
        </p>
      ) : (
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {catalog.map((product) => (
            <article
              key={product.id}
              className="flex flex-col border-t border-border/70 pt-6"
            >
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {typeLabel(product.type)}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                {product.name}
              </h2>
              <p className="mt-3 flex-1 text-sm leading-[1.5em] text-muted-foreground">
                {product.description ||
                  "Mehr Details und Kaufoptionen auf der Produktseite."}
              </p>
              <div className="mt-6">
                <Link
                  href={`/products/${product.slug}`}
                  className={cn(buttonVariants())}
                >
                  Mehr erfahren
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
