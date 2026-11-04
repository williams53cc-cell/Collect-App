import { describe, expect, it } from "vitest";
import { QUOTE_SECTIONS } from "./quotes";
import {
  QUOTE_TEMPLATES,
  getQuoteTemplate,
  submittedPrice,
} from "./quote-templates";

describe("quote templates", () => {
  it("have unique ids", () => {
    const ids = QUOTE_TEMPLATES.map((template) => template.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only use real sections and always have a description and a unit", () => {
    for (const template of QUOTE_TEMPLATES) {
      expect(template.lines.length).toBeGreaterThan(0);
      for (const line of template.lines) {
        expect(QUOTE_SECTIONS).toContain(line.section);
        expect(line.description.trim()).not.toBe("");
        expect(line.unit.trim()).not.toBe("");
        expect(line.description.length).toBeLessThanOrEqual(300);
        expect(line.unit.length).toBeLessThanOrEqual(30);
        expect(line.stage.length).toBeLessThanOrEqual(100);
      }
    }
  });

  it("matches the 13 labour lines of the real invoice and prices blocks per 100", () => {
    const labour = getQuoteTemplate("house-labour");
    expect(labour?.lines).toHaveLength(13);
    expect(labour?.lines.every((line) => line.section === "labour")).toBe(true);
    expect(
      labour?.lines.find((line) => line.description.includes("blocks"))?.unit
    ).toBe("100 blocks");
  });

  it("has the 25 lines of the real material list, all materials", () => {
    const materials = getQuoteTemplate("house-materials");
    expect(materials?.lines).toHaveLength(25);
    expect(materials?.lines.every((line) => line.section === "materials")).toBe(
      true
    );
  });

  it("fills in a price on every labour line and none on materials", () => {
    for (const template of QUOTE_TEMPLATES) {
      for (const line of template.lines) {
        if (line.section === "labour") {
          expect(Number(line.unitPrice)).toBeGreaterThan(0);
        } else {
          expect(line.unitPrice).toBeUndefined();
        }
      }
    }
  });

  it("combines both lists", () => {
    expect(getQuoteTemplate("house-both")?.lines).toHaveLength(38);
  });

  it("finds a template by id, and returns null for unknown or missing ids", () => {
    expect(getQuoteTemplate("house-labour")?.name).toBe("House labour");
    expect(getQuoteTemplate("nope")).toBeNull();
    expect(getQuoteTemplate(undefined)).toBeNull();
  });
});

describe("submittedPrice", () => {
  it("drops a suggested price when no quantity was entered", () => {
    expect(submittedPrice("", "1400", "1400")).toBe("");
    expect(submittedPrice("  ", " 1400 ", "1400")).toBe("");
  });

  it("keeps the price once a quantity is entered", () => {
    expect(submittedPrice("50", "1400", "1400")).toBe("1400");
  });

  it("keeps a price the contractor changed, even with no quantity", () => {
    expect(submittedPrice("", "1600", "1400")).toBe("1600");
  });

  it("leaves lines without a suggested price alone", () => {
    expect(submittedPrice("", "", "")).toBe("");
    expect(submittedPrice("", "250", undefined)).toBe("250");
    expect(submittedPrice("3", "250", "")).toBe("250");
  });
});
