import { AdminSettingsForm } from "@/components/admin-settings-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getRequestTenant } from "@/lib/tenant/resolve";

export default async function AdminSettingsPage() {
  const tenant = await getRequestTenant();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Firma & Tax</h1>
        <p className="text-muted-foreground">
          White-Label-Stammdaten – erscheinen auf Impressum und Rechnungen.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Tenant-Einstellungen</CardTitle>
          <CardDescription>{tenant.tenant.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminSettingsForm
            settings={{
              companyName: tenant.settings.companyName,
              managingDirector: tenant.settings.managingDirector,
              addressLine1: tenant.settings.addressLine1,
              postalCode: tenant.settings.postalCode,
              city: tenant.settings.city,
              country: tenant.settings.country,
              phone: tenant.settings.phone,
              supportEmail: tenant.settings.supportEmail,
              vatId: tenant.settings.vatId,
              commercialRegister: tenant.settings.commercialRegister,
              registerCourt: tenant.settings.registerCourt,
              invoicePrefix: tenant.settings.invoicePrefix,
              brandColor: tenant.settings.brandColor,
              mailFromName: tenant.settings.mailFromName,
              mailFromEmail: tenant.settings.mailFromEmail,
            }}
            tax={{
              taxMode: tenant.tax.taxMode,
              homeCountry: tenant.tax.homeCountry,
              homeVatRate: String(tenant.tax.homeVatRate),
              euB2cThresholdNet: tenant.tax.euB2cThresholdNet,
              allowNonEuCheckout: tenant.tax.allowNonEuCheckout,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
