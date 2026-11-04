import { describe, expect, it } from "vitest";
import type { QuoteDetail } from "@/lib/data/quotes";
import type { Database } from "@/types/database";
import { addressWithTaxNumbers, toQuotePdfInput } from "./quote-pdf-input";

type Profile = Database["public"]["Tables"]["business_profiles"]["Row"];

const quote: QuoteDetail = {
  id: "q1",
  user_id: "u1",
  customer_id: null,
  quote_number: 7,
  title: "Roof",
  client_name: "Ms. Brown",
  client_phone: "  ",
  client_email: "ms.brown@example.com",
  client_address: null,
  status: "draft",
  currency: "JMD",
  discount_amount: 100,
  tax_rate: 15,
  customer_view: "detailed",
  valid_until: "2026-12-04",
  notes: " Fixtures not included. ",
  created_at: "2026-11-04T02:30:00Z",
  updated_at: "2026-11-04T02:30:00Z",
  items: [
    {
      id: "i1",
      user_id: "u1",
      quote_id: "q1",
      section: "labour",
      stage: " ",
      position: 0,
      description: "Fix roof",
      unit: "day",
      quantity: 2,
      unit_price: 5000,
      amount: 10000,
      created_at: "2026-11-04T02:30:00Z",
    },
  ],
  totals: {
    materials_total: 0,
    labour_total: 10000,
    extras_total: 0,
    subtotal: 10000,
    discount_amount: 100,
    tax_amount: 1485,
    total: 11385,
  },
};

const profile: Profile = {
  user_id: "u1",
  first_name: null,
  last_name: null,
  business_name: " Brown Construction ",
  business_type: "mason",
  currency: "JMD",
  country: null,
  timezone: "America/Jamaica",
  payment_method: "bank_transfer",
  payment_link: null,
  payment_instructions: "Use the quote number.",
  business_phone: "(876) 555-0123",
  business_email: null,
  business_address: "12 Main Street",
  trn: null,
  gct_number: null,
  quote_terms: "50% deposit.",
  include_payment_link_default: true,
  onboarding_completed: true,
  created_at: "2026-11-01T00:00:00Z",
};

describe("toQuotePdfInput", () => {
  it("uses the saved quote, its database totals and the business profile", () => {
    const result = toQuotePdfInput(quote, profile);
    expect(result.business).toEqual({
      name: "Brown Construction",
      phone: "(876) 555-0123",
      email: null,
      address: "12 Main Street",
      terms: "50% deposit.",
    });
    expect(result.quote.number).toBe("Q-0007");
    expect(result.quote.clientPhone).toBeNull();
    expect(result.quote.notes).toBe("Fixtures not included.");
    expect(result.quote.taxRate).toBe(15);
    expect(result.quote.totals).toEqual({
      materials: 0,
      labour: 10000,
      extras: 0,
      subtotal: 10000,
      discount: 100,
      tax: 1485,
      total: 11385,
    });
    expect(result.quote.items).toEqual([
      {
        section: "labour",
        stage: null,
        description: "Fix roof",
        unit: "day",
        quantity: 2,
        unitPrice: 5000,
        amount: 10000,
      },
    ]);
    expect(result.timeZone).toBe("America/Jamaica");
  });

  it("copes with no business profile", () => {
    const none = toQuotePdfInput(quote, null);
    expect(none.business.name).toBe("");
    expect(none.business.terms).toBeNull();
  });

  it("does not put bank or payment details on a quote", () => {
    const result = toQuotePdfInput(quote, profile);
    expect(JSON.stringify(result)).not.toContain("Use the quote number.");
    expect(Object.keys(result.business)).not.toContain("paymentInstructions");
  });
});

describe("addressWithTaxNumbers", () => {
  const base = { business_address: "12 Main Street", trn: null, gct_number: null };

  it("is just the address when there are no tax numbers", () => {
    expect(addressWithTaxNumbers(base)).toBe("12 Main Street");
  });

  it("adds the TRN and the GCT number on their own lines", () => {
    expect(
      addressWithTaxNumbers({
        business_address: " 12 Main Street ",
        trn: " 123-456-789 ",
        gct_number: "GCT 0001",
      })
    ).toBe("12 Main Street\nTRN: 123-456-789\nGCT No: GCT 0001");
  });

  it("still prints a tax number when there is no address", () => {
    expect(
      addressWithTaxNumbers({ business_address: "", trn: "123", gct_number: null })
    ).toBe("TRN: 123");
  });

  it("is null when there is nothing to print", () => {
    expect(addressWithTaxNumbers(null)).toBeNull();
    expect(
      addressWithTaxNumbers({ business_address: " ", trn: "", gct_number: " " })
    ).toBeNull();
  });
});
