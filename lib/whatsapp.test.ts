import { describe, expect, it } from "vitest";
import { quoteShareMessage, whatsappLink, whatsappNumber } from "./whatsapp";

describe("whatsappNumber", () => {
  it("adds the 1 for a 10-digit Jamaican or North American number", () => {
    expect(whatsappNumber("(876) 555-0123")).toBe("18765550123");
    expect(whatsappNumber("876-555-0123")).toBe("18765550123");
    expect(whatsappNumber("8765550123")).toBe("18765550123");
  });

  it("keeps a number that already has its country code", () => {
    expect(whatsappNumber("+1 876 555 0123")).toBe("18765550123");
    expect(whatsappNumber("+44 7700 900123")).toBe("447700900123");
    expect(whatsappNumber("0044 7700 900123")).toBe("447700900123");
  });

  it("gives null when there is no usable number", () => {
    expect(whatsappNumber(null)).toBeNull();
    expect(whatsappNumber("")).toBeNull();
    expect(whatsappNumber("555-0123")).toBeNull();
    expect(whatsappNumber("not a number")).toBeNull();
    expect(whatsappNumber("1".repeat(20))).toBeNull();
  });
});

describe("quoteShareMessage", () => {
  const details = {
    clientName: "Ms. Brown",
    quoteLabel: "Q-0007",
    title: "Two-bedroom house",
    total: 5023891.27,
    currency: "JMD",
    businessName: "Brown Construction",
  };

  it("writes a short friendly message with the total", () => {
    expect(quoteShareMessage(details)).toBe(
      "Hi Ms. Brown, here is quote Q-0007 for Two-bedroom house from " +
        "Brown Construction. Total: JMD 5,023,891.27. " +
        "Please let me know if you have any questions."
    );
  });

  it("leaves out the business when there is no name", () => {
    expect(quoteShareMessage({ ...details, businessName: " " })).toBe(
      "Hi Ms. Brown, here is quote Q-0007 for Two-bedroom house. " +
        "Total: JMD 5,023,891.27. Please let me know if you have any questions."
    );
  });
});

describe("whatsappLink", () => {
  it("opens the customer's chat when there is a number", () => {
    expect(whatsappLink("876-555-0123", "Hi & bye")).toBe(
      "https://wa.me/18765550123?text=Hi%20%26%20bye"
    );
  });

  it("lets you pick a contact when there is no number", () => {
    expect(whatsappLink(null, "Hi")).toBe("https://wa.me/?text=Hi");
  });
});
