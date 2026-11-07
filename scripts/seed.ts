import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import {
  plans,
  products,
  tenantSecrets,
  tenantSettings,
  tenantTaxConfig,
  tenants,
  user,
} from "../src/lib/db/schema";
import { createId } from "../src/lib/id";

async function main() {
  const tenantId = "tenant_strgl";

  const existing = await db.query.tenants.findFirst({
    where: eq(tenants.slug, "strgl"),
  });

  if (!existing) {
    await db.insert(tenants).values({
      id: tenantId,
      slug: "strgl",
      name: "strgl",
      customDomain: "strgl.de",
      active: true,
    });

    await db.insert(tenantSettings).values({
      tenantId,
      companyName: "Tidenhub Digital GmbH",
      managingDirector: "Hans-Jürgen Herbst",
      addressLine1: "Hestoft 22",
      postalCode: "24897",
      city: "Ulsnis",
      country: "DE",
      phone: "0173 415 84 93",
      supportEmail: "moin@website-tutor.com",
      vatId: "DE313222577",
      commercialRegister: "HRB 15867",
      registerCourt: "Amtsgericht Flensburg",
      invoicePrefix: "STRGL",
      brandColor: "#0f766e",
      mailFromName: "strgl",
      participatesInConsumerArbitration: false,
    });

    await db.insert(tenantTaxConfig).values({
      tenantId,
      taxMode: "home_vat_below_threshold",
      homeCountry: "DE",
      homeVatRate: "0.1900",
      euB2cThresholdNet: 10000,
      euB2cYtdNetCents: 0,
      euB2cYtdYear: new Date().getFullYear(),
      allowNonEuCheckout: false,
    });

    await db.insert(tenantSecrets).values({ tenantId });
  }

  const tid = existing?.id ?? tenantId;

  const demoProduct = await db.query.products.findFirst({
    where: eq(products.slug, "demo-plugin"),
  });

  if (!demoProduct) {
    const productId = createId("prod");
    await db.insert(products).values({
      id: productId,
      tenantId: tid,
      slug: "demo-plugin",
      name: "Demo Plugin",
      description: "Beispiel-WordPress-Plugin mit Domain-Lizenz.",
      type: "plugin",
      features: ["pro_dashboard", "priority_updates"],
      active: true,
    });

    await db.insert(plans).values([
      {
        id: createId("plan"),
        tenantId: tid,
        productId,
        name: "1 Site / Jahr",
        interval: "year",
        priceCents: 4900,
        maxSites: 1,
        active: true,
      },
      {
        id: createId("plan"),
        tenantId: tid,
        productId,
        name: "5 Sites / Jahr",
        interval: "year",
        priceCents: 9900,
        maxSites: 5,
        active: true,
      },
    ]);
  }

  // Promote admin by email if provided
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  if (adminEmail) {
    await db
      .update(user)
      .set({ role: "admin", tenantId: tid })
      .where(eq(user.email, adminEmail));
    console.log(`Promoted ${adminEmail} to admin`);
  }

  console.log("Seed complete for tenant strgl");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
