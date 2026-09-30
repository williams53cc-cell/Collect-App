import { describe, expect, it } from "vitest";
import { buildBusinessPaymentLink } from "./business-payment-link";

describe("buildBusinessPaymentLink", () => {
  it("returns null when no payment link is saved", () => {
    expect(buildBusinessPaymentLink("paypal", null, 450)).toBeNull();
    expect(buildBusinessPaymentLink(null, null, 450)).toBeNull();
  });

  it("rebuilds a PayPal link pre-filled with the amount owed", () => {
    expect(
      buildBusinessPaymentLink("paypal", "https://paypal.me/jordansmith", 450)
    ).toBe("https://paypal.me/jordansmith/450.00");
  });

  it("rebuilds a PayPal link from a bare username too", () => {
    expect(buildBusinessPaymentLink("paypal", "jordansmith", 99.999)).toBe(
      "https://paypal.me/jordansmith/100.00"
    );
  });

  it("uses a non-PayPal link exactly as saved, with no amount appended", () => {
    expect(
      buildBusinessPaymentLink("venmo", "https://venmo.com/u/jordansmith", 450)
    ).toBe("https://venmo.com/u/jordansmith");
  });

  it("uses the saved link as-is when no payment method is set", () => {
    expect(buildBusinessPaymentLink(null, "https://example.com/pay", 450)).toBe(
      "https://example.com/pay"
    );
  });
});
