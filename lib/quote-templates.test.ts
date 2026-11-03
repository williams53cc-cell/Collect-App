import { describe, expect, it } from "vitest";
import { QUOTE_SECTIONS } from "./quotes";
import { QUOTE_TEMPLATES, getQuoteTemplate } from "./quote-templates";

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

  it("combines both lists", () => {
    expect(getQuoteTemplate("house-both")?.lines).toHaveLength(38);
  });

  it("finds a template by id, and returns null for unknown or missing ids", () => {
    expect(getQuoteTemplate("house-labour")?.name).toBe("House labour");
    expect(getQuoteTemplate("nope")).toBeNull();
    expect(getQuoteTemplate(undefined)).toBeNull();
  });
});
