import { describe, expect, it } from "vitest";
import { parseDecimal, parseQuoteForm } from "./quote";

function form(fields: Record<string, string>, items?: unknown): FormData {
  const data = new FormData();
  const base: Record<string, string> = {
    title: "Roof repair",
    client_name: "Ms. Madge",
    ...fields,
  };
  for (const [key, value] of Object.entries(base)) data.set(key, value);
  if (items !== undefined) data.set("items_json", JSON.stringify(items));
  return data;
}

const goodItem = {
  section: "materials",
  stage: "Foundation",
  description: "Cement",
  unit: "bag",
  quantity: "50",
  unit_price: "1,750",
};

describe("parseDecimal", () => {
  it("reads plain numbers, commas and spaces", () => {
    expect(parseDecimal("12")).toBe(12);
    expect(parseDecimal("1,500.50")).toBe(1500.5);
    expect(parseDecimal(" 2 500 ")).toBe(2500);
    expect(parseDecimal(".5")).toBe(0.5);
    expect(parseDecimal("5.")).toBe(5);
    expect(parseDecimal(7)).toBe(7);
  });

  it("returns undefined for empty and null for junk or negatives", () => {
    expect(parseDecimal("")).toBeUndefined();
    expect(parseDecimal("  ")).toBeUndefined();
    expect(parseDecimal(undefined)).toBeUndefined();
    expect(parseDecimal("abc")).toBeNull();
    expect(parseDecimal("-5")).toBeNull();
    expect(parseDecimal("1e5")).toBeNull();
    expect(parseDecimal("1.2.3")).toBeNull();
    expect(parseDecimal(-1)).toBeNull();
    expect(parseDecimal(Number.NaN)).toBeNull();
    expect(parseDecimal("9".repeat(400))).toBeNull();
  });
});

describe("parseQuoteForm", () => {
  it("accepts a valid quote and cleans it up", () => {
    const result = parseQuoteForm(
      form(
        {
          client_phone: " 876-555-0100 ",
          customer_view: "section_totals",
          discount_amount: "1,000",
          tax_rate: "15",
          valid_until: "2026-12-01",
          notes: "  Pay 50% first  ",
        },
        [goodItem]
      )
    );
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toEqual({
      title: "Roof repair",
      client_name: "Ms. Madge",
      client_phone: "876-555-0100",
      client_email: null,
      client_address: null,
      customer_id: null,
      customer_view: "section_totals",
      valid_until: "2026-12-01",
      notes: "Pay 50% first",
      discount_amount: 1000,
      tax_rate: 15,
      items: [
        {
          section: "materials",
          stage: "Foundation",
          position: 0,
          description: "Cement",
          unit: "bag",
          quantity: 50,
          unit_price: 1750,
        },
      ],
    });
  });

  it("defaults the view to detailed, discount and tax to 0", () => {
    const result = parseQuoteForm(form({}, [goodItem]));
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.customer_view).toBe("detailed");
    expect(result.data.discount_amount).toBe(0);
    expect(result.data.tax_rate).toBe(0);
  });

  it("requires a title and a client name", () => {
    const result = parseQuoteForm(form({ title: " ", client_name: "" }, [goodItem]));
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.title).toBeDefined();
    expect(result.errors.client_name).toBeDefined();
  });

  it("rejects a bad email, date and customer id", () => {
    const result = parseQuoteForm(
      form(
        { client_email: "nope", valid_until: "next week", customer_id: "123" },
        [goodItem]
      )
    );
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.client_email).toBeDefined();
    expect(result.errors.valid_until).toBeDefined();
    expect(result.errors.customer_id).toBeDefined();
  });

  it("accepts a real customer id", () => {
    const result = parseQuoteForm(
      form({ customer_id: "6f1c2a9e-3b4d-4e5f-8a7b-9c0d1e2f3a4b" }, [goodItem])
    );
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.customer_id).toBe("6f1c2a9e-3b4d-4e5f-8a7b-9c0d1e2f3a4b");
  });

  it("needs at least one line", () => {
    const none = parseQuoteForm(form({}, []));
    expect(none.success).toBe(false);
    if (none.success) return;
    expect(none.errors.items).toEqual(["Add at least one line to the quote."]);
  });

  it("ignores rows nobody typed in", () => {
    const result = parseQuoteForm(
      form({}, [
        goodItem,
        { section: "labour", description: "", unit: "", stage: "", quantity: "1", unit_price: "" },
        { section: "extras", description: "", quantity: "1", unit_price: "0" },
      ])
    );
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.items).toHaveLength(1);
  });

  it("numbers lines in the order given and counts positions after skipping blanks", () => {
    const result = parseQuoteForm(
      form({}, [
        goodItem,
        { section: "labour", description: "", quantity: "1", unit_price: "" },
        { ...goodItem, section: "labour", description: "Block laying" },
      ])
    );
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.items.map((i) => i.position)).toEqual([0, 1]);
  });

  it("says which line is wrong", () => {
    const result = parseQuoteForm(
      form({}, [
        goodItem,
        { ...goodItem, section: "labour", description: "" },
        { ...goodItem, section: "labour", quantity: "0" },
        { ...goodItem, section: "labour", unit_price: "" },
        { ...goodItem, section: "extras", quantity: "abc" },
      ])
    );
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.items).toEqual([
      "Labour line 1: add a description.",
      "Labour line 2: quantity must be more than 0.",
      "Labour line 3: enter a unit price (0 if it is free).",
      "Extras line 1: quantity must be a number.",
    ]);
  });

  it("rounds quantity to 3 decimals and price to 2", () => {
    const result = parseQuoteForm(
      form({}, [{ ...goodItem, quantity: "1.23456", unit_price: "10.999" }])
    );
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.items[0].quantity).toBe(1.235);
    expect(result.data.items[0].unit_price).toBe(11);
  });

  it("allows a free line (price 0) but not a missing one", () => {
    const free = parseQuoteForm(form({}, [{ ...goodItem, unit_price: "0" }]));
    expect(free.success).toBe(true);
  });

  it("blocks amounts too big for the database", () => {
    const line = parseQuoteForm(
      form({}, [{ ...goodItem, quantity: "99999999", unit_price: "999999999" }])
    );
    expect(line.success).toBe(false);
    if (line.success) return;
    expect(line.errors.items?.[0]).toMatch(/too large/);

    const qty = parseQuoteForm(form({}, [{ ...goodItem, quantity: "100000000" }]));
    expect(qty.success).toBe(false);
  });

  it("blocks a total that is too large across many lines", () => {
    const big = { ...goodItem, quantity: "1000", unit_price: "999999999" };
    const result = parseQuoteForm(
      form({}, [big, big, big, big])
    );
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.items).toContain("The quote total is too large.");
  });

  it("rejects bad discount and tax", () => {
    const result = parseQuoteForm(
      form({ discount_amount: "abc", tax_rate: "150" }, [goodItem])
    );
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.discount_amount).toBeDefined();
    expect(result.errors.tax_rate).toBeDefined();
  });

  it("rejects broken or missing line-item data and unknown sections", () => {
    const broken = new FormData();
    broken.set("title", "A");
    broken.set("client_name", "B");
    broken.set("items_json", "{not json");
    const a = parseQuoteForm(broken);
    expect(a.success).toBe(false);

    const missing = new FormData();
    missing.set("title", "A");
    missing.set("client_name", "B");
    expect(parseQuoteForm(missing).success).toBe(false);

    const b = parseQuoteForm(form({}, [{ ...goodItem, section: "gold" }]));
    expect(b.success).toBe(false);
  });

  it("limits the number of lines", () => {
    const many = Array.from({ length: 201 }, () => goodItem);
    const result = parseQuoteForm(form({}, many));
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.items?.[0]).toMatch(/at most 200/);
  });

  it("limits long text", () => {
    const result = parseQuoteForm(
      form({}, [{ ...goodItem, description: "x".repeat(301), unit: "u".repeat(31), stage: "s".repeat(101) }])
    );
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.items).toHaveLength(3);
  });
});
