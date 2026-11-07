import { eq } from "drizzle-orm";
import { AdminProductForm } from "@/components/admin-product-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/lib/db";
import { plans, products } from "@/lib/db/schema";
import { getRequestTenant } from "@/lib/tenant/resolve";

export default async function AdminProductsPage() {
  const tenant = await getRequestTenant();
  const [prods, plns] = await Promise.all([
    db.query.products.findMany({
      where: eq(products.tenantId, tenant.tenant.id),
    }),
    db.query.plans.findMany({
      where: eq(plans.tenantId, tenant.tenant.id),
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Produkte</h1>

      <Card>
        <CardHeader>
          <CardTitle>Neues Produkt</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminProductForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Katalog</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produkt</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Preis</TableHead>
                <TableHead>Sites</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plns.map((plan) => {
                const product = prods.find((p) => p.id === plan.productId);
                return (
                  <TableRow key={plan.id}>
                    <TableCell>
                      {product?.name}{" "}
                      <span className="text-muted-foreground">
                        ({product?.slug})
                      </span>
                    </TableCell>
                    <TableCell>
                      {plan.name} · {plan.interval}
                    </TableCell>
                    <TableCell>
                      {(plan.priceCents / 100).toFixed(2)} €
                    </TableCell>
                    <TableCell>{plan.maxSites}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
