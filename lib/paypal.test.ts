import { describe, expect, it } from "vitest";
import { buildPaypalLink, normalizePaypalUsername } from "./paypal";

describe("normalizePaypalUsername", () => {
  it("returns a bare username unchanged", () => {
    expect(normalizePaypalUsername("jordansmith")).toBe("jordansmith");
  });

  it("strips a full https link down to the username", () => {
    expect(normalizePaypalUsername("https://paypal.me/jordansmith")).toBe(
      "jordansmith"
    );
  });

  it("strips a www link down to the username", () => {
    expect(normalizePaypalUsername("https://www.paypal.me/jordansmith")).toBe(
      "jordansmith"
    );
  });

  it("strips a bare paypal.me/ prefix with no protocol", () => {
    expect(normalizePaypalUsername("paypal.me/jordansmith")).toBe(
      "jordansmith"
    );
  });

  it("drops a trailing slash or amount segment", () => {
    expect(normalizePaypalUsername("https://paypal.me/jordansmith/50")).toBe(
      "jordansmith"
    );
    expect(normalizePaypalUsername("paypal.me/jordansmith/")).toBe(
      "jordansmith"
    );
  });

  it("drops a leading @", () => {
    expect(normalizePaypalUsername("@jordansmith")).toBe("jordansmith");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizePaypalUsername("  jordansmith  ")).toBe("jordansmith");
  });

  it("returns an empty string unchanged", () => {
    expect(normalizePaypalUsername("")).toBe("");
    expect(normalizePaypalUsername("   ")).toBe("");
  });
});

describe("buildPaypalLink", () => {
  it("builds a link with the amount formatted to two decimal places", () => {
    expect(buildPaypalLink("jordansmith", 450)).toBe(
      "https://paypal.me/jordansmith/450.00"
    );
  });

  it("rounds to two decimal places", () => {
    expect(buildPaypalLink("jordansmith", 99.999)).toBe(
      "https://paypal.me/jordansmith/100.00"
    );
  });
});
