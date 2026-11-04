import { describe, expect, it } from "vitest";
import type { InvoiceDetail } from "@/lib/data/invoices";
import { toInvoicePdfInput } from "./invoice-pdf-input";

const invoice = {
  id: "i1",
  user_id: "u1",
  customer_id: null,
  quote_id: null,
  invoice_number: 12,
  title: "Fence",
  client_name: "Mr. Green",
  client_phone: " 876-555-0111 ",
  client_email: "",
  client_address: "  ",
  status: "issued",
  currency: "JMD",
  discount_amount: 500,
  tax_rate: 0,
  customer_view: "detailed",
  issued_on: "2026-11-04",
  due_on: "2026-11-18",
  notes: " Thanks ",
  voided_at: null,
  void_reason: null,
  created_at: "2026-11-04T02:30:00Z",
  updated_at: "2026-11-04T02:30:00Z",
  items: [
    {
      id: "l1",
      user_id: "u1",
      invoice_id: "i1",
      section: "labour",
      stage: " ",
      position: 0,
      description: "Build fence",
      unit: "",
      quantity: 2,
      unit_price: 1000,
      amount: 2000,
      created_at: "2026-11-04T02:30:00Z",
    },
  ],
  totals: {
    materials_total: 0,
    labour_total: 2000,
    extras_total: 0,
    subtotal: 2000,
    discount_amount: 500,
    tax_amount: 0,
    total: 1500,
  },
} as unknown as InvoiceDetail;

const profile = {
  business_name: " Green Works ",
  business_phone: "876-555-0100",
  business_email: null,
  business_address: "",
  payment_instructions: "Sample Bank\nAccount 000000",
  timezone: "America/Jamaica",
} as never;

describe("toInvoicePdfInput", () => {
  it("copies the invoice and the payment details and tidies blanks", () => {
    const input = toInvoicePdfInput(invoice, profile);
    expect(input).not.toBeNull();
    expect(input!.business.name).toBe("Green Works");
    expect(input!.business.address).toBeNull();
    expect(input!.business.paymentInstructions).toBe(
      "Sample Bank\nAccount 000000\n\n" +
        "Payment is due by 18 Nov 2026. Please use INV-0012 as your payment reference."
    );
    expect(input!.invoice.number).toBe("INV-0012");
    expect(input!.invoice.issuedOn).toBe("2026-11-04");
    expect(input!.invoice.dueOn).toBe("2026-11-18");
    expect(input!.invoice.status).toBe("issued");
    expect(input!.invoice.clientPhone).toBe("876-555-0111");
    expect(input!.invoice.clientEmail).toBeNull();
    expect(input!.invoice.jobAddress).toBeNull();
    expect(input!.invoice.notes).toBe("Thanks");
    expect(input!.invoice.totals.total).toBe(1500);
    expect(input!.invoice.items[0].stage).toBeNull();
    expect(input!.invoice.items[0].unit).toBeNull();
    expect(input!.timeZone).toBe("America/Jamaica");
  });

  it("works with no business profile yet", () => {
    const input = toInvoicePdfInput(invoice, null);
    expect(input!.business.name).toBe("");
    // No bank details saved: still say when to pay and what reference to use.
    expect(input!.business.paymentInstructions).toBe(
      "Payment is due by 18 Nov 2026. Please use INV-0012 as your payment reference."
    );
  });

  it("leaves out the due date when there is none", () => {
    const input = toInvoicePdfInput({ ...invoice, due_on: null }, null);
    expect(input!.business.paymentInstructions).toBe(
      "Please use INV-0012 as your payment reference."
    );
  });

  it("keeps a cancelled invoice and its number", () => {
    const input = toInvoicePdfInput({ ...invoice, status: "void" }, profile);
    expect(input!.invoice.status).toBe("void");
    expect(input!.invoice.number).toBe("INV-0012");
  });

  it("has nothing to print for a draft", () => {
    expect(
      toInvoicePdfInput(
        { ...invoice, status: "draft", invoice_number: null },
        profile
      )
    ).toBeNull();
  });
});
