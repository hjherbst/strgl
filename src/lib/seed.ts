import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  plans,
  products,
  tenantSecrets,
  tenantSettings,
  tenantTaxConfig,
  tenants,
  user,
} from "@/lib/db/schema";
import { createId } from "@/lib/id";

export async function runSeed() {
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
        creditsAmount: 0,
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
        creditsAmount: 0,
        active: true,
      },
    ]);
  }

  const storyboards = await db.query.products.findFirst({
    where: eq(products.slug, "storyboards"),
  });

  if (!storyboards) {
    const productId = createId("prod");
    await db.insert(products).values({
      id: productId,
      tenantId: tid,
      slug: "storyboards",
      name: "Storyboards AI",
      description:
        "WordPress Storyboards Plugin — free editor, paid AI credits for Beat Tranches.",
      type: "plugin",
      features: [
        "ai_assistant",
        "ai_description",
        "ai_script",
        "ai_image",
      ],
      active: true,
    });

    await db.insert(plans).values([
      {
        id: createId("plan"),
        tenantId: tid,
        productId,
        name: "50 AI Credits",
        interval: "one_time",
        priceCents: 900,
        maxSites: 1,
        creditsAmount: 50,
        active: true,
      },
      {
        id: createId("plan"),
        tenantId: tid,
        productId,
        name: "200 AI Credits",
        interval: "one_time",
        priceCents: 2900,
        maxSites: 3,
        creditsAmount: 200,
        active: true,
      },
      {
        id: createId("plan"),
        tenantId: tid,
        productId,
        name: "500 AI Credits",
        interval: "one_time",
        priceCents: 5900,
        maxSites: 5,
        creditsAmount: 500,
        active: true,
      },
    ]);
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
  let promotedAdmin: string | null = null;
  if (adminEmail) {
    await db
      .update(user)
      .set({ role: "admin", tenantId: tid })
      .where(eq(user.email, adminEmail));
    promotedAdmin = adminEmail;
  }

  return { tenantId: tid, promotedAdmin };
}
