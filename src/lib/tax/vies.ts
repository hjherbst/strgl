import { normalizeVatId } from "@/lib/eu";

export type ViesResult = {
  valid: boolean;
  name?: string;
  address?: string;
  raw?: unknown;
};

/**
 * Validates an EU VAT ID via the official VIES REST endpoint.
 */
export async function validateVatId(vatId: string): Promise<ViesResult> {
  const normalized = normalizeVatId(vatId);
  const countryCode = normalized.slice(0, 2);
  const number = normalized.slice(2);

  if (!countryCode || !number) {
    return { valid: false };
  }

  try {
    const res = await fetch(
      "https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryCode, vatNumber: number }),
        next: { revalidate: 0 },
      },
    );

    if (!res.ok) {
      return { valid: false };
    }

    const data = (await res.json()) as {
      valid?: boolean;
      name?: string;
      address?: string;
    };

    return {
      valid: Boolean(data.valid),
      name: data.name,
      address: data.address,
      raw: data,
    };
  } catch {
    return { valid: false };
  }
}
