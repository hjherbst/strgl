import assert from "node:assert/strict";
import { decideTax } from "./engine";
import type { TenantTaxConfig } from "@/lib/db/schema";

const baseConfig = {
  tenantId: "t1",
  taxMode: "home_vat_below_threshold",
  homeCountry: "DE",
  homeVatRate: "0.1900",
  euB2cThresholdNet: 10000,
  euB2cYtdNetCents: 0,
  euB2cYtdYear: 2026,
  allowNonEuCheckout: false,
  updatedAt: new Date(),
} satisfies TenantTaxConfig;

const deB2c = decideTax(baseConfig, {
  buyerCountry: "DE",
  netCents: 10000,
});
assert.equal(deB2c.taxCase, "home_vat");
assert.equal(deB2c.taxCents, 1900);
assert.equal(deB2c.grossCents, 11900);

const frB2c = decideTax(baseConfig, {
  buyerCountry: "FR",
  netCents: 10000,
});
assert.equal(frB2c.taxCase, "home_vat");
assert.equal(frB2c.countsTowardEuB2cThreshold, true);

const frB2b = decideTax(baseConfig, {
  buyerCountry: "FR",
  buyerVatId: "FR123",
  buyerVatIdValid: true,
  netCents: 10000,
});
assert.equal(frB2b.taxCase, "reverse_charge");
assert.equal(frB2b.taxCents, 0);

console.log("tax engine tests passed");
