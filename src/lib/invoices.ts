import { eq, sql } from "drizzle-orm";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { db } from "@/lib/db";
import {
  invoiceCounters,
  invoices,
  type TenantSettings,
} from "@/lib/db/schema";
import { createId } from "@/lib/id";
import type { TaxDecision } from "@/lib/tax/engine";

function formatEuro(cents: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export async function nextInvoiceNumber(
  tenantId: string,
  prefix: string,
  year = new Date().getFullYear(),
) {
  const existing = await db.query.invoiceCounters.findFirst({
    where: eq(invoiceCounters.tenantId, tenantId),
  });

  let next = 1;
  if (!existing) {
    await db.insert(invoiceCounters).values({
      tenantId,
      year,
      lastNumber: 1,
    });
  } else if (existing.year !== year) {
    await db
      .update(invoiceCounters)
      .set({ year, lastNumber: 1 })
      .where(eq(invoiceCounters.tenantId, tenantId));
  } else {
    next = existing.lastNumber + 1;
    await db
      .update(invoiceCounters)
      .set({ lastNumber: next })
      .where(eq(invoiceCounters.tenantId, tenantId));
  }

  return `${prefix}-${year}-${String(next).padStart(6, "0")}`;
}

export async function createInvoicePdf(opts: {
  number: string;
  settings: TenantSettings;
  buyerName: string;
  buyerCompany?: string | null;
  buyerAddress: string;
  buyerCountry: string;
  buyerVatId?: string | null;
  tax: TaxDecision;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitNetCents: number;
    totalNetCents: number;
  }>;
  issuedAt?: Date;
}) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let y = 800;

  const draw = (text: string, x: number, size = 10, useBold = false) => {
    page.drawText(text, {
      x,
      y,
      size,
      font: useBold ? bold : font,
      color: rgb(0.1, 0.1, 0.1),
    });
  };

  draw("RECHNUNG", 50, 18, true);
  y -= 28;
  draw(opts.settings.companyName, 50, 11, true);
  y -= 14;
  draw(opts.settings.addressLine1, 50);
  y -= 12;
  draw(`${opts.settings.postalCode} ${opts.settings.city}`, 50);
  y -= 12;
  if (opts.settings.vatId) {
    draw(`USt-IdNr.: ${opts.settings.vatId}`, 50);
    y -= 12;
  }
  if (opts.settings.commercialRegister) {
    draw(
      `Handelsregister: ${opts.settings.commercialRegister}${
        opts.settings.registerCourt ? ` ${opts.settings.registerCourt}` : ""
      }`,
      50,
    );
    y -= 12;
  }

  y -= 16;
  draw(`Rechnungsnummer: ${opts.number}`, 50, 11, true);
  y -= 14;
  draw(
    `Rechnungsdatum: ${(opts.issuedAt ?? new Date()).toLocaleDateString("de-DE")}`,
    50,
  );
  y -= 24;

  draw("Rechnungsempfänger", 50, 11, true);
  y -= 14;
  if (opts.buyerCompany) {
    draw(opts.buyerCompany, 50);
    y -= 12;
  }
  draw(opts.buyerName, 50);
  y -= 12;
  for (const line of opts.buyerAddress.split("\n")) {
    draw(line, 50);
    y -= 12;
  }
  draw(opts.buyerCountry, 50);
  y -= 12;
  if (opts.buyerVatId) {
    draw(`USt-IdNr.: ${opts.buyerVatId}`, 50);
    y -= 12;
  }

  y -= 20;
  draw("Pos.", 50, 10, true);
  draw("Beschreibung", 90, 10, true);
  draw("Netto", 450, 10, true);
  y -= 16;

  opts.lineItems.forEach((item, idx) => {
    draw(String(idx + 1), 50);
    draw(item.description.slice(0, 60), 90);
    draw(formatEuro(item.totalNetCents), 450);
    y -= 14;
  });

  y -= 20;
  draw(`Netto: ${formatEuro(opts.tax.netCents)}`, 400);
  y -= 14;
  draw(
    `MwSt. (${(opts.tax.taxRate * 100).toFixed(0)}%): ${formatEuro(opts.tax.taxCents)}`,
    400,
  );
  y -= 14;
  draw(`Brutto: ${formatEuro(opts.tax.grossCents)}`, 400, 11, true);
  y -= 24;

  if (opts.tax.taxNote) {
    draw(opts.tax.taxNote, 50, 9);
    y -= 14;
  }

  if (opts.settings.managingDirector) {
    y -= 10;
    draw(`Geschäftsführer: ${opts.settings.managingDirector}`, 50, 9);
  }

  const bytes = await pdf.save();
  return Buffer.from(bytes).toString("base64");
}

export async function issueInvoice(opts: {
  tenantId: string;
  userId: string;
  settings: TenantSettings;
  buyerName: string;
  buyerCompany?: string | null;
  buyerAddress: string;
  buyerCountry: string;
  buyerVatId?: string | null;
  tax: TaxDecision;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitNetCents: number;
    totalNetCents: number;
  }>;
  orderId?: string;
  subscriptionId?: string;
}) {
  const number = await nextInvoiceNumber(
    opts.tenantId,
    opts.settings.invoicePrefix,
  );
  const pdfBase64 = await createInvoicePdf({
    number,
    settings: opts.settings,
    buyerName: opts.buyerName,
    buyerCompany: opts.buyerCompany,
    buyerAddress: opts.buyerAddress,
    buyerCountry: opts.buyerCountry,
    buyerVatId: opts.buyerVatId,
    tax: opts.tax,
    lineItems: opts.lineItems,
  });

  const id = createId("inv");
  await db.insert(invoices).values({
    id,
    tenantId: opts.tenantId,
    userId: opts.userId,
    number,
    status: "issued",
    amountNetCents: opts.tax.netCents,
    amountTaxCents: opts.tax.taxCents,
    amountGrossCents: opts.tax.grossCents,
    taxCase: opts.tax.taxCase,
    taxRate: opts.tax.taxRate.toFixed(4),
    taxNote: opts.tax.taxNote,
    buyerName: opts.buyerName,
    buyerCompany: opts.buyerCompany,
    buyerAddress: opts.buyerAddress,
    buyerCountry: opts.buyerCountry,
    buyerVatId: opts.buyerVatId,
    lineItems: opts.lineItems,
    pdfBase64,
    orderId: opts.orderId,
    subscriptionId: opts.subscriptionId,
  });

  return { id, number, pdfBase64 };
}

export async function bumpEuB2cYtd(tenantId: string, netCents: number) {
  const year = new Date().getFullYear();
  await db.execute(sql`
    UPDATE tenant_tax_config
    SET
      eu_b2c_ytd_net_cents = CASE
        WHEN eu_b2c_ytd_year = ${year} THEN eu_b2c_ytd_net_cents + ${netCents}
        ELSE ${netCents}
      END,
      eu_b2c_ytd_year = ${year},
      updated_at = NOW()
    WHERE tenant_id = ${tenantId}
  `);
}
