import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const taxModeEnum = pgEnum("tax_mode", [
  "home_vat_below_threshold",
  "oss",
  "home_b2c_only",
]);

export const productTypeEnum = pgEnum("product_type", ["plugin", "webapp"]);

export const planIntervalEnum = pgEnum("plan_interval", [
  "one_time",
  "month",
  "year",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "past_due",
  "canceled",
  "incomplete",
  "trialing",
  "unpaid",
]);

export const entitlementStatusEnum = pgEnum("entitlement_status", [
  "active",
  "grace",
  "expired",
  "revoked",
]);

export const taxCaseEnum = pgEnum("tax_case", [
  "home_vat",
  "reverse_charge",
  "oss",
  "export",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "issued",
  "void",
]);

export const userRoleEnum = pgEnum("user_role", [
  "customer",
  "admin",
  "platform_admin",
]);

export const creditLedgerTypeEnum = pgEnum("credit_ledger_type", [
  "purchase",
  "consume",
  "refund",
  "grant",
  "adjust",
]);

// --- Auth (Better Auth) ---

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: userRoleEnum("role").notNull().default("customer"),
  tenantId: text("tenant_id").references(() => tenants.id),
  companyName: text("company_name"),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  postalCode: text("postal_code"),
  country: text("country").default("DE"),
  vatId: text("vat_id"),
  vatIdValid: boolean("vat_id_valid"),
  vatIdValidatedAt: timestamp("vat_id_validated_at"),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// --- Tenants / White-label ---

export const tenants = pgTable("tenants", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  customDomain: text("custom_domain"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const tenantSettings = pgTable("tenant_settings", {
  tenantId: text("tenant_id")
    .primaryKey()
    .references(() => tenants.id, { onDelete: "cascade" }),
  companyName: text("company_name").notNull(),
  managingDirector: text("managing_director"),
  addressLine1: text("address_line1").notNull(),
  addressLine2: text("address_line2"),
  postalCode: text("postal_code").notNull(),
  city: text("city").notNull(),
  country: text("country").notNull().default("DE"),
  phone: text("phone"),
  supportEmail: text("support_email").notNull(),
  vatId: text("vat_id").notNull(),
  commercialRegister: text("commercial_register"),
  registerCourt: text("register_court"),
  invoicePrefix: text("invoice_prefix").notNull().default("STRGL"),
  logoUrl: text("logo_url"),
  brandColor: text("brand_color").default("#0f766e"),
  mailFromName: text("mail_from_name"),
  mailFromEmail: text("mail_from_email"),
  participatesInConsumerArbitration: boolean(
    "participates_in_consumer_arbitration",
  )
    .notNull()
    .default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const tenantTaxConfig = pgTable("tenant_tax_config", {
  tenantId: text("tenant_id")
    .primaryKey()
    .references(() => tenants.id, { onDelete: "cascade" }),
  taxMode: taxModeEnum("tax_mode")
    .notNull()
    .default("home_vat_below_threshold"),
  homeCountry: text("home_country").notNull().default("DE"),
  homeVatRate: numeric("home_vat_rate", { precision: 5, scale: 4 })
    .notNull()
    .default("0.1900"),
  euB2cThresholdNet: integer("eu_b2c_threshold_net").notNull().default(10000),
  euB2cYtdNetCents: integer("eu_b2c_ytd_net_cents").notNull().default(0),
  euB2cYtdYear: integer("eu_b2c_ytd_year").notNull().default(new Date().getFullYear()),
  allowNonEuCheckout: boolean("allow_non_eu_checkout").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const tenantSecrets = pgTable("tenant_secrets", {
  tenantId: text("tenant_id")
    .primaryKey()
    .references(() => tenants.id, { onDelete: "cascade" }),
  stripeSecretKeyEnc: text("stripe_secret_key_enc"),
  stripeWebhookSecretEnc: text("stripe_webhook_secret_enc"),
  stripePublishableKey: text("stripe_publishable_key"),
  resendApiKeyEnc: text("resend_api_key_enc"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// --- Catalog ---

export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    type: productTypeEnum("type").notNull(),
    features: jsonb("features").$type<string[]>().default([]),
    active: boolean("active").notNull().default(true),
    stripeProductId: text("stripe_product_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("products_tenant_slug").on(t.tenantId, t.slug)],
);

export const plans = pgTable("plans", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  interval: planIntervalEnum("interval").notNull(),
  priceCents: integer("price_cents").notNull(),
  currency: text("currency").notNull().default("eur"),
  maxSites: integer("max_sites").default(1),
  /** Credits granted on purchase (0 = none / license-only). */
  creditsAmount: integer("credits_amount").notNull().default(0),
  active: boolean("active").notNull().default(true),
  stripePriceId: text("stripe_price_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const bundles = pgTable("bundles", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  priceCents: integer("price_cents").notNull(),
  currency: text("currency").notNull().default("eur"),
  interval: planIntervalEnum("interval").notNull().default("one_time"),
  active: boolean("active").notNull().default(true),
  stripePriceId: text("stripe_price_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const bundleItems = pgTable("bundle_items", {
  id: text("id").primaryKey(),
  bundleId: text("bundle_id")
    .notNull()
    .references(() => bundles.id, { onDelete: "cascade" }),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  planId: text("plan_id").references(() => plans.id),
});

// --- Commerce ---

export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  status: text("status").notNull().default("pending"),
  amountNetCents: integer("amount_net_cents").notNull().default(0),
  amountTaxCents: integer("amount_tax_cents").notNull().default(0),
  amountGrossCents: integer("amount_gross_cents").notNull().default(0),
  currency: text("currency").notNull().default("eur"),
  taxCase: taxCaseEnum("tax_case"),
  taxRate: numeric("tax_rate", { precision: 5, scale: 4 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  planId: text("plan_id").references(() => plans.id),
  bundleId: text("bundle_id").references(() => bundles.id),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  status: subscriptionStatusEnum("status").notNull().default("incomplete"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  canceledAt: timestamp("canceled_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const entitlements = pgTable(
  "entitlements",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    status: entitlementStatusEnum("status").notNull().default("active"),
    sourceType: text("source_type").notNull(),
    sourceId: text("source_id"),
    validUntil: timestamp("valid_until"),
    graceUntil: timestamp("grace_until"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("entitlements_user_product").on(t.userId, t.productId),
    index("entitlements_tenant_user").on(t.tenantId, t.userId),
  ],
);

export const licenses = pgTable(
  "licenses",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    planId: text("plan_id").references(() => plans.id),
    key: text("key").notNull().unique(),
    maxActivations: integer("max_activations").notNull().default(1),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("licenses_key").on(t.key)],
);

export const licenseActivations = pgTable(
  "license_activations",
  {
    id: text("id").primaryKey(),
    licenseId: text("license_id")
      .notNull()
      .references(() => licenses.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    activatedAt: timestamp("activated_at").notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
    deactivatedAt: timestamp("deactivated_at"),
  },
  (t) => [
    uniqueIndex("license_domain_active").on(t.licenseId, t.domain),
  ],
);

export const invoices = pgTable(
  "invoices",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    number: text("number").notNull(),
    status: invoiceStatusEnum("status").notNull().default("issued"),
    issuedAt: timestamp("issued_at").notNull().defaultNow(),
    serviceDate: timestamp("service_date").notNull().defaultNow(),
    amountNetCents: integer("amount_net_cents").notNull(),
    amountTaxCents: integer("amount_tax_cents").notNull(),
    amountGrossCents: integer("amount_gross_cents").notNull(),
    currency: text("currency").notNull().default("eur"),
    taxCase: taxCaseEnum("tax_case").notNull(),
    taxRate: numeric("tax_rate", { precision: 5, scale: 4 }).notNull(),
    taxNote: text("tax_note"),
    buyerName: text("buyer_name").notNull(),
    buyerCompany: text("buyer_company"),
    buyerAddress: text("buyer_address").notNull(),
    buyerCountry: text("buyer_country").notNull(),
    buyerVatId: text("buyer_vat_id"),
    lineItems: jsonb("line_items")
      .$type<
        Array<{
          description: string;
          quantity: number;
          unitNetCents: number;
          totalNetCents: number;
        }>
      >()
      .notNull(),
    pdfBase64: text("pdf_base64"),
    stripeInvoiceId: text("stripe_invoice_id"),
    orderId: text("order_id").references(() => orders.id),
    subscriptionId: text("subscription_id").references(() => subscriptions.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("invoices_tenant_number").on(t.tenantId, t.number)],
);

export const invoiceCounters = pgTable("invoice_counters", {
  tenantId: text("tenant_id")
    .primaryKey()
    .references(() => tenants.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  lastNumber: integer("last_number").notNull().default(0),
});

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").references(() => tenants.id),
    provider: text("provider").notNull().default("stripe"),
    eventId: text("event_id").notNull(),
    type: text("type").notNull(),
    processedAt: timestamp("processed_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("webhook_provider_event").on(t.provider, t.eventId)],
);

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id),
  actorUserId: text("actor_user_id").references(() => user.id),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// --- AI Credits ---

export const creditWallets = pgTable(
  "credit_wallets",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    licenseId: text("license_id").references(() => licenses.id, {
      onDelete: "set null",
    }),
    balance: integer("balance").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("credit_wallets_user_product").on(t.userId, t.productId),
    index("credit_wallets_license").on(t.licenseId),
  ],
);

export const creditLedger = pgTable(
  "credit_ledger",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    walletId: text("wallet_id")
      .notNull()
      .references(() => creditWallets.id, { onDelete: "cascade" }),
    type: creditLedgerTypeEnum("type").notNull(),
    amount: integer("amount").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    reason: text("reason"),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("credit_ledger_idempotency").on(t.idempotencyKey),
    index("credit_ledger_wallet").on(t.walletId),
  ],
);

export type Tenant = typeof tenants.$inferSelect;
export type TenantSettings = typeof tenantSettings.$inferSelect;
export type TenantTaxConfig = typeof tenantTaxConfig.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type User = typeof user.$inferSelect;
export type Entitlement = typeof entitlements.$inferSelect;
export type License = typeof licenses.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type CreditWallet = typeof creditWallets.$inferSelect;
export type CreditLedgerEntry = typeof creditLedger.$inferSelect;
