import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import {
  buildQuotePdf,
  formatMoney,
  formatPdfDate,
  formatQuantity,
  pdfSafe,
  quotePdfFileName,
  wrapText,
  type QuotePdfInput,
  type QuotePdfItem,
} from "./quote-pdf";

function item(over: Partial<QuotePdfItem> = {}): QuotePdfItem {
  return {
    section: "materials",
    stage: null,
    description: "Cement",
    unit: "bag",
    quantity: 10,
    unitPrice: 1750,
    amount: 17500,
    ...over,
  };
}

function input(
  items: QuotePdfItem[],
  over: Partial<QuotePdfInput["quote"]> = {}
): QuotePdfInput {
  return {
    business: {
      name: "Brown Construction",
      phone: "(876) 555-0123",
      email: "name@example.com",
      address: "12 Main Street, Spanish Town",
      terms: "50% deposit before work starts.",
    },
    quote: {
      number: "Q-0007",
      title: "Two-bedroom house",
      issuedOn: "2026-11-04T02:30:00Z",
      validUntil: "2026-12-04",
      clientName: "Ms. Brown",
      clientPhone: "876-555-0100",
      clientEmail: "ms.brown@example.com",
      jobAddress: "45 Sample Lane, Portmore",
      currency: "JMD",
      customerView: "detailed",
      notes: "Fixtures not included.",
      taxRate: 0,
      totals: {
        materials: 17500,
        labour: 0,
        extras: 0,
        subtotal: 17500,
        discount: 0,
        tax: 0,
        total: 17500,
      },
      items,
      ...over,
    },
    timeZone: "America/Jamaica",
  };
}

async function pageCount(bytes: Uint8Array) {
  return (await PDFDocument.load(bytes)).getPageCount();
}

describe("buildQuotePdf", () => {
  it("makes a real one-page A4 PDF", async () => {
    const bytes = await buildQuotePdf(input([item()]));
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    const { width, height } = doc.getPage(0).getSize();
    expect(Math.round(width)).toBe(595);
    expect(Math.round(height)).toBe(842);
  });

  it("works with the summary view", async () => {
    const bytes = await buildQuotePdf(
      input([item()], { customerView: "section_totals" })
    );
    expect(await pageCount(bytes)).toBe(1);
  });

  it("works with no business details, notes or addresses", async () => {
    const data = input([item()], {
      notes: null,
      validUntil: null,
      jobAddress: null,
      clientPhone: null,
      clientEmail: null,
    });
    data.business = {
      name: "",
      phone: null,
      email: null,
      address: null,
      terms: null,
    };
    expect(await pageCount(await buildQuotePdf(data))).toBe(1);
  });

  it("runs onto more pages for a long quote", async () => {
    const many = Array.from({ length: 150 }, (_, i) =>
      item({ description: `Item ${i + 1}`, stage: i < 75 ? "Walls" : "Roof" })
    );
    const bytes = await buildQuotePdf(input(many));
    expect(await pageCount(bytes)).toBeGreaterThan(3);
  });

  it("copes with odd characters, emoji and very long words", async () => {
    const bytes = await buildQuotePdf(
      input([
        item({
          description: `Lay 6" blocks, 2\u00d76 lumber \u00bd yard \ud83d\ude00 \u6f22\u5b57 ${"x".repeat(200)}`,
        }),
      ])
    );
    expect(await pageCount(bytes)).toBe(1);
  });

  it("copes with a very long note", async () => {
    const bytes = await buildQuotePdf(
      input([item()], { notes: "A long note. ".repeat(500) })
    );
    expect(await pageCount(bytes)).toBeGreaterThan(1);
  });
});

describe("pdfSafe and wrapText", () => {
  it("keeps normal text and swaps what the font cannot draw", async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    expect(pdfSafe('6" \u00d7 2 \u00bd', font)).toBe('6" \u00d7 2 \u00bd');
    expect(pdfSafe("6\u2033", font)).toBe('6"');
    expect(pdfSafe("a\ud83d\ude00b", font)).toBe("a?b");
    expect(pdfSafe("line\none", font)).toBe("line one");
  });

  it("wraps at the width, keeps line breaks and cuts huge words", async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const lines = wrapText("one two three four five six seven", font, 10, 60);
    expect(lines.length).toBeGreaterThan(2);
    for (const line of lines) {
      expect(font.widthOfTextAtSize(line, 10)).toBeLessThanOrEqual(60);
    }
    expect(wrapText("a\n\nb", font, 10, 200)).toEqual(["a", "", "b"]);
    const cut = wrapText("x".repeat(300), font, 10, 100);
    expect(cut.length).toBeGreaterThan(1);
    for (const line of cut) {
      expect(font.widthOfTextAtSize(line, 10)).toBeLessThanOrEqual(100);
    }
    expect(wrapText("", font, 10, 100)).toEqual([""]);
  });
});

describe("formatting", () => {
  it("formats money and quantities", () => {
    expect(formatMoney(5023891.27)).toBe("5,023,891.27");
    expect(formatMoney(0)).toBe("0.00");
    expect(formatQuantity(1.5)).toBe("1.5");
    expect(formatQuantity(5000)).toBe("5,000");
    expect(formatQuantity(0.125)).toBe("0.125");
  });

  it("formats dates in the contractor's time zone", () => {
    expect(formatPdfDate("2026-12-04")).toBe("4 Dec 2026");
    // 02:30 UTC on the 4th is still the evening of the 3rd in Jamaica.
    expect(formatPdfDate("2026-11-04T02:30:00Z", "America/Jamaica")).toBe(
      "3 Nov 2026"
    );
    expect(formatPdfDate("2026-11-04T02:30:00Z", "Not/AZone")).toBe(
      "3 Nov 2026"
    );
    expect(formatPdfDate("garbage")).toBe("garbage");
  });

  it("makes a safe file name", () => {
    expect(quotePdfFileName("Q-0007", "Ms. Brown")).toBe("Q-0007-Ms-Brown.pdf");
    expect(quotePdfFileName("Q-0007", "../../etc/passwd")).toBe(
      "Q-0007-etc-passwd.pdf"
    );
    expect(quotePdfFileName("Q-0007", "\ud83d\ude00")).toBe("Q-0007.pdf");
  });
});
