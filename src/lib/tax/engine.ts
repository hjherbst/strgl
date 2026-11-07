import type { TenantTaxConfig } from "@/lib/db/schema";
import { isEuCountry } from "@/lib/eu";

export type TaxInput = {
  buyerCountry: string;
  buyerVatId?: string | null;
  buyerVatIdValid?: boolean | null;
  netCents: number;
};

export type TaxDecision = {
  taxCase: "home_vat" | "reverse_charge" | "oss" | "export";
  taxRate: number;
  taxCents: number;
  grossCents: number;
  netCents: number;
  taxNote: string | null;
  blocked?: boolean;
  blockReason?: string;
  countsTowardEuB2cThreshold: boolean;
};

function roundCents(value: number) {
  return Math.round(value);
}

/**
 * Configurable tax decision for digital goods.
 * Default mode: home VAT for EU B2C below OSS threshold; RC for valid EU B2B.
 */
export function decideTax(
  config: TenantTaxConfig,
  input: TaxInput,
): TaxDecision {
  const country = input.buyerCountry.toUpperCase();
  const home = config.homeCountry.toUpperCase();
  const homeRate = Number(config.homeVatRate);
  const hasValidVat =
    Boolean(input.buyerVatId) && input.buyerVatIdValid === true;
  const inEu = isEuCountry(country);

  if (!inEu) {
    if (!config.allowNonEuCheckout) {
      return {
        taxCase: "export",
        taxRate: 0,
        taxCents: 0,
        grossCents: input.netCents,
        netCents: input.netCents,
        taxNote: null,
        blocked: true,
        blockReason:
          "Käufe außerhalb der EU sind derzeit nicht freigeschaltet.",
        countsTowardEuB2cThreshold: false,
      };
    }
    return {
      taxCase: "export",
      taxRate: 0,
      taxCents: 0,
      grossCents: input.netCents,
      netCents: input.netCents,
      taxNote: "Steuerfreie Ausfuhrlieferung / nicht steuerbar in DE.",
      countsTowardEuB2cThreshold: false,
    };
  }

  // EU B2B reverse charge (outside home country)
  if (hasValidVat && country !== home) {
    return {
      taxCase: "reverse_charge",
      taxRate: 0,
      taxCents: 0,
      grossCents: input.netCents,
      netCents: input.netCents,
      taxNote:
        "Steuerschuldnerschaft des Leistungsempfängers (Reverse Charge).",
      countsTowardEuB2cThreshold: false,
    };
  }

  if (config.taxMode === "home_b2c_only" && country !== home && !hasValidVat) {
    return {
      taxCase: "home_vat",
      taxRate: homeRate,
      taxCents: 0,
      grossCents: input.netCents,
      netCents: input.netCents,
      taxNote: null,
      blocked: true,
      blockReason:
        "Privatkunden können aktuell nur mit Rechnungsadresse im Heimatland bestellen. Geschäftskunden: bitte gültige USt-IdNr. angeben.",
      countsTowardEuB2cThreshold: false,
    };
  }

  if (config.taxMode === "oss" && country !== home && !hasValidVat) {
    // Placeholder: OSS rates table can be plugged in later / Stripe Tax.
    // Until then, fall back to home rate with explicit note.
    const taxCents = roundCents(input.netCents * homeRate);
    return {
      taxCase: "oss",
      taxRate: homeRate,
      taxCents,
      grossCents: input.netCents + taxCents,
      netCents: input.netCents,
      taxNote:
        "OSS-Modus aktiv – Zielland-MwSt. noch nicht tabelliert; aktuell Heimat-Satz (bitte Raten hinterlegen).",
      countsTowardEuB2cThreshold: true,
    };
  }

  // Default: home_vat_below_threshold (and home B2B / home B2C)
  const taxCents = roundCents(input.netCents * homeRate);
  return {
    taxCase: "home_vat",
    taxRate: homeRate,
    taxCents,
    grossCents: input.netCents + taxCents,
    netCents: input.netCents,
    taxNote: null,
    countsTowardEuB2cThreshold: country !== home && !hasValidVat,
  };
}
