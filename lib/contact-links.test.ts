import { describe, expect, it } from "vitest";
import { buildWhatsAppLink } from "./contact-links";

describe("buildWhatsAppLink", () => {
  it("strips punctuation from a plain 10-digit number and adds the US country code", () => {
    expect(buildWhatsAppLink("555-123-4567", "hi")).toBe(
      "https://wa.me/15551234567?text=hi"
    );
    expect(buildWhatsAppLink("(555) 123-4567", "hi")).toBe(
      "https://wa.me/15551234567?text=hi"
    );
  });

  it("leaves an already-11-digit number (with country code) untouched", () => {
    expect(buildWhatsAppLink("1 555 123 4567", "hi")).toBe(
      "https://wa.me/15551234567?text=hi"
    );
  });

  it("strips a leading + from an international number without reinterpreting it", () => {
    expect(buildWhatsAppLink("+44 7911 123456", "hi")).toBe(
      "https://wa.me/447911123456?text=hi"
    );
  });

  it("omits the number entirely when there's no phone on file", () => {
    expect(buildWhatsAppLink(null, "hi")).toBe("https://wa.me/?text=hi");
    expect(buildWhatsAppLink("", "hi")).toBe("https://wa.me/?text=hi");
  });

  it("URL-encodes the message body", () => {
    expect(buildWhatsAppLink("5551234567", "Hi Jordan, following up")).toBe(
      "https://wa.me/15551234567?text=Hi%20Jordan%2C%20following%20up"
    );
  });
});
