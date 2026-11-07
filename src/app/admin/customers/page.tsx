import { desc, eq } from "drizzle-orm";
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
import { entitlements, invoices, licenses, user } from "@/lib/db/schema";
import { getRequestTenant } from "@/lib/tenant/resolve";

export default async function AdminCustomersPage() {
  const tenant = await getRequestTenant();

  // Customers who bought or registered with this tenant, plus all users for MVP overview
  const customers = await db.query.user.findMany({
    orderBy: [desc(user.createdAt)],
    limit: 100,
  });

  const [ents, lic, invs] = await Promise.all([
    db.query.entitlements.findMany({
      where: eq(entitlements.tenantId, tenant.tenant.id),
    }),
    db.query.licenses.findMany({
      where: eq(licenses.tenantId, tenant.tenant.id),
    }),
    db.query.invoices.findMany({
      where: eq(invoices.tenantId, tenant.tenant.id),
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Kunden</h1>
      <Card>
        <CardHeader>
          <CardTitle>Übersicht</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>E-Mail</TableHead>
                <TableHead>Land</TableHead>
                <TableHead>Entitlements</TableHead>
                <TableHead>Lizenzen</TableHead>
                <TableHead>Rechnungen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.email}</TableCell>
                  <TableCell>{c.country}</TableCell>
                  <TableCell>
                    {ents.filter((e) => e.userId === c.id).length}
                  </TableCell>
                  <TableCell>
                    {lic.filter((l) => l.userId === c.id).length}
                  </TableCell>
                  <TableCell>
                    {invs.filter((i) => i.userId === c.id).length}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
