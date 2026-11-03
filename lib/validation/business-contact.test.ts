import { describe, expect, it } from "vitest";
import {
  parseBusinessContactForm,
  QUOTE_TERMS_MAX,
} from "./business-contact";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("parseBusinessContactForm", () => {
  it("accepts all boxes empty", () => {
    const result = parseBusinessContactForm(form({}));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        business_phone: "",
        business_email: "",
        business_address: "",
        quote_terms: "",
      });
    }
  });

  it("trims spaces and keeps real details", () => {
    const result = parseBusinessContactForm(
      form({
        business_phone: "  (876) 555-0123 ",
        business_email: " name@example.com ",
        business_address: " 12 Main Street, Spanish Town, St. Catherine ",
        quote_terms: " 50% deposit before work starts. ",
      })
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.business_phone).toBe("(876) 555-0123");
      expect(result.data.business_email).toBe("name@example.com");
      expect(result.data.business_address).toBe(
        "12 Main Street, Spanish Town, St. Catherine"
      );
      expect(result.data.quote_terms).toBe("50% deposit before work starts.");
    }
  });

  it("rejects an email that is not an email", () => {
    const result = parseBusinessContactForm(
      form({ business_email: "not-an-email" })
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path[0]).toBe("business_email");
    }
  });

  it("rejects terms that are too long", () => {
    const result = parseBusinessContactForm(
      form({ quote_terms: "a".repeat(QUOTE_TERMS_MAX + 1) })
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path[0]).toBe("quote_terms");
    }
  });

  it("accepts terms exactly at the limit", () => {
    const result = parseBusinessContactForm(
      form({ quote_terms: "a".repeat(QUOTE_TERMS_MAX) })
    );
    expect(result.success).toBe(true);
  });
});
