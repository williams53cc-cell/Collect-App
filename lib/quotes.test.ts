import { describe, expect, it } from "vitest";
import {
  calculateQuoteTotals,
  formatQuoteNumber,
  isQuoteExpired,
  lineAmount,
  type QuoteLine,
} from "./quotes";

// The 13 labour lines from a real contractor invoice (Ms. Madge quotation).
// The document's own total is 4,303,600.00.
const MADGE_LABOUR: QuoteLine[] = [
  [1.5, 100000],
  [70, 1500],
  [20, 10000],
  [5000, 150],
  [392, 1400],
  [187, 1400],
  [410, 1400],
  [0.75, 100000],
  [50, 1500],
  [24, 25000],
  [3, 100000],
  [214, 1000],
  [45, 10000],
].map(([quantity, unitPrice]) => ({
  section: "labour" as const,
  quantity,
  unitPrice,
}));

describe("lineAmount", () => {
  it("multiplies quantity by unit price", () => {
    expect(lineAmount(5000, 150)).toBe(750000);
    expect(lineAmount(0.75, 100000)).toBe(75000);
  });

  it("rounds to the nearest cent, halves up", () => {
    expect(lineAmount(2.5, 1000.55)).toBe(2501.38);
    expect(lineAmount(1.005, 1)).toBe(1.01);
    expect(lineAmount(0.333, 1)).toBe(0.33);
  });

  it("treats missing, negative and non-numeric values as zero", () => {
    expect(lineAmount(-3, 100)).toBe(0);
    expect(lineAmount(3, -100)).toBe(0);
    expect(lineAmount(Number.NaN, 100)).toBe(0);
    expect(lineAmount(Infinity, 100)).toBe(0);
  });

  it("stays exact for very large amounts", () => {
    expect(lineAmount(100000000, 9999.99)).toBe(999999000000);
  });
});

describe("calculateQuoteTotals", () => {
  it("matches the real labour invoice total", () => {
    const totals = calculateQuoteTotals(MADGE_LABOUR, 0, 0);
    expect(totals.labour).toBe(4303600);
    expect(totals.subtotal).toBe(4303600);
    expect(totals.total).toBe(4303600);
  });

  it("splits materials, labour and extras, then applies discount and tax", () => {
    const lines: QuoteLine[] = [
      ...MADGE_LABOUR,
      { section: "materials", quantity: 50, unitPrice: 1750 },
      { section: "materials", quantity: 25, unitPrice: 2500 },
      { section: "extras", quantity: 2, unitPrice: 7500.55 },
    ];
    // Same numbers as the database test: see supabase/migrations/0011_quotes.sql
    expect(calculateQuoteTotals(lines, 100000, 15)).toEqual({
      materials: 150000,
      labour: 4303600,
      extras: 15001.1,
      subtotal: 4468601.1,
      discount: 100000,
      tax: 655290.17,
      total: 5023891.27,
    });
  });

  it("has no tax when the rate is 0", () => {
    const totals = calculateQuoteTotals(
      [{ section: "materials", quantity: 10, unitPrice: 99.99 }],
      0,
      0
    );
    expect(totals.tax).toBe(0);
    expect(totals.total).toBe(999.9);
  });

  it("never goes below zero when the discount is bigger than the subtotal", () => {
    const totals = calculateQuoteTotals(
      [{ section: "extras", quantity: 1, unitPrice: 100 }],
      500,
      15
    );
    expect(totals.subtotal).toBe(100);
    expect(totals.tax).toBe(0);
    expect(totals.total).toBe(0);
  });

  it("handles an empty quote", () => {
    expect(calculateQuoteTotals([], 0, 0).total).toBe(0);
    expect(calculateQuoteTotals([], 50, 15).total).toBe(0);
  });

  it("rounds tax to the nearest cent, halves up", () => {
    // 3.33 x 15% = 0.4995 -> 0.50
    const totals = calculateQuoteTotals(
      [{ section: "materials", quantity: 1, unitPrice: 3.33 }],
      0,
      15
    );
    expect(totals.tax).toBe(0.5);
    expect(totals.total).toBe(3.83);
  });

  it("caps the tax rate at 100% and ignores a negative rate", () => {
    const line: QuoteLine[] = [
      { section: "materials", quantity: 1, unitPrice: 100 },
    ];
    expect(calculateQuoteTotals(line, 0, 500).tax).toBe(100);
    expect(calculateQuoteTotals(line, 0, -5).tax).toBe(0);
  });
});

describe("formatQuoteNumber", () => {
  it("pads to four digits", () => {
    expect(formatQuoteNumber(1)).toBe("Q-0001");
    expect(formatQuoteNumber(42)).toBe("Q-0042");
    expect(formatQuoteNumber(12345)).toBe("Q-12345");
  });
});

describe("isQuoteExpired", () => {
  it("is expired when a draft or sent quote is past its valid-until date", () => {
    expect(isQuoteExpired("2026-10-01", "draft", "2026-10-30")).toBe(true);
    expect(isQuoteExpired("2026-10-01", "sent", "2026-10-30")).toBe(true);
  });

  it("is not expired on the valid-until day itself", () => {
    expect(isQuoteExpired("2026-10-30", "sent", "2026-10-30")).toBe(false);
  });

  it("never expires accepted or declined quotes, or ones with no date", () => {
    expect(isQuoteExpired("2026-10-01", "accepted", "2026-10-30")).toBe(false);
    expect(isQuoteExpired("2026-10-01", "declined", "2026-10-30")).toBe(false);
    expect(isQuoteExpired(null, "sent", "2026-10-30")).toBe(false);
  });
});
