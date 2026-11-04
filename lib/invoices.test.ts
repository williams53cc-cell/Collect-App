import { describe, expect, it } from "vitest";
import {
  addDaysISO,
  formatInvoiceNumber,
  formatLineQuantity,
  parseDueDate,
  parseVoidReason,
} from "./invoices";

describe("formatInvoiceNumber", () => {
  it("pads the number", () => {
    expect(formatInvoiceNumber(7)).toBe("INV-0007");
    expect(formatInvoiceNumber(12345)).toBe("INV-12345");
  });

  it("shows Draft when there is no number yet", () => {
    expect(formatInvoiceNumber(null)).toBe("Draft");
  });
});

describe("addDaysISO", () => {
  it("adds days across month and year ends", () => {
    expect(addDaysISO("2026-11-03", 14)).toBe("2026-11-17");
    expect(addDaysISO("2026-12-25", 14)).toBe("2027-01-08");
    expect(addDaysISO("2028-02-20", 10)).toBe("2028-03-01");
  });
});

describe("parseDueDate", () => {
  it("accepts empty as no due date", () => {
    expect(parseDueDate("")).toEqual({ ok: true, value: null });
    expect(parseDueDate(null)).toEqual({ ok: true, value: null });
    expect(parseDueDate("  ")).toEqual({ ok: true, value: null });
  });

  it("accepts a real date", () => {
    expect(parseDueDate("2026-12-01")).toEqual({ ok: true, value: "2026-12-01" });
  });

  it("rejects text and impossible dates", () => {
    expect(parseDueDate("tomorrow").ok).toBe(false);
    expect(parseDueDate("2026-02-31").ok).toBe(false);
    expect(parseDueDate("2026-13-01").ok).toBe(false);
  });
});

describe("parseVoidReason", () => {
  it("trims and treats empty as none", () => {
    expect(parseVoidReason("  Wrong quantity ")).toEqual({
      ok: true,
      value: "Wrong quantity",
    });
    expect(parseVoidReason("")).toEqual({ ok: true, value: null });
    expect(parseVoidReason(undefined)).toEqual({ ok: true, value: null });
  });

  it("rejects a very long reason", () => {
    expect(parseVoidReason("x".repeat(501)).ok).toBe(false);
    expect(parseVoidReason("x".repeat(500)).ok).toBe(true);
  });
});

describe("formatLineQuantity", () => {
  it("drops needless zeros and groups thousands", () => {
    expect(formatLineQuantity(1.5)).toBe("1.5");
    expect(formatLineQuantity(5000)).toBe("5,000");
    expect(formatLineQuantity(0.125)).toBe("0.125");
    expect(formatLineQuantity(2)).toBe("2");
  });
});
