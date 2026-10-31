import { describe, expect, it } from "vitest";
import {
  createQuoteWithItems,
  duplicateQuoteWithItems,
  removeQuote,
  setQuoteStatus,
  updateQuoteWithItems,
} from "./quote-writes";
import type { QuoteInput } from "@/lib/validation/quote";

interface Call {
  table: string;
  op: "select" | "insert" | "update" | "delete";
  payload?: unknown;
  filters: Record<string, unknown>;
}

/** A tiny pretend database client that records what was asked of it and can
 * be told to fail a particular step, e.g. "quote_items.delete". */
function fakeClient(options: {
  fail?: string[];
  rows?: Record<string, unknown[]>;
  updateMatches?: boolean;
}) {
  const calls: Call[] = [];
  let counter = 0;

  function from(table: string) {
    const call: Call = { table, op: "select", filters: {} };
    let returning = false;
    let single = false;

    const builder: Record<string, unknown> = {
      select() {
        returning = true;
        return builder;
      },
      insert(payload: unknown) {
        call.op = "insert";
        call.payload = payload;
        return builder;
      },
      update(payload: unknown) {
        call.op = "update";
        call.payload = payload;
        return builder;
      },
      delete() {
        call.op = "delete";
        return builder;
      },
      eq(column: string, value: unknown) {
        call.filters[column] = value;
        return builder;
      },
      in(column: string, value: unknown) {
        call.filters[column] = value;
        return builder;
      },
      order() {
        return builder;
      },
      single() {
        single = true;
        return builder;
      },
      maybeSingle() {
        single = true;
        return builder;
      },
      then(resolve: (value: unknown) => unknown) {
        calls.push(call);
        const key = `${table}.${call.op}`;
        if (options.fail?.includes(key)) {
          return resolve({ data: null, error: { message: `failed: ${key}` } });
        }
        let data: unknown = null;
        if (call.op === "insert" && returning) {
          const payload = call.payload;
          const list = Array.isArray(payload) ? payload : [payload];
          const made = list.map(() => ({ id: `new-${++counter}` }));
          data = single ? made[0] : made;
        } else if (call.op === "update" && returning) {
          data = options.updateMatches === false ? [] : [{ id: "q1" }];
        } else if (call.op === "select") {
          const rows = options.rows?.[table] ?? [];
          data = single ? (rows[0] ?? null) : rows;
        }
        return resolve({ data, error: null });
      },
    };
    return builder;
  }

  return { client: { from } as never, calls };
}

const input: QuoteInput = {
  title: "Roof",
  client_name: "Ms. Madge",
  client_phone: null,
  client_email: null,
  client_address: null,
  customer_id: null,
  customer_view: "detailed",
  valid_until: null,
  notes: null,
  discount_amount: 0,
  tax_rate: 0,
  items: [
    {
      section: "materials",
      stage: null,
      position: 0,
      description: "Cement",
      unit: "bag",
      quantity: 5,
      unit_price: 100,
    },
  ],
};

const ops = (calls: Call[]) => calls.map((c) => `${c.table}.${c.op}`);

describe("createQuoteWithItems", () => {
  it("saves the quote and then its lines", async () => {
    const { client, calls } = fakeClient({});
    const result = await createQuoteWithItems(client, "u1", input);
    expect(result).toEqual({ id: "new-1" });
    expect(ops(calls)).toEqual(["quotes.insert", "quote_items.insert"]);
    expect((calls[0].payload as { user_id: string }).user_id).toBe("u1");
    expect(calls[1].payload).toEqual([
      expect.objectContaining({ quote_id: "new-1", description: "Cement" }),
    ]);
  });

  it("removes the empty quote when the lines fail to save", async () => {
    const { client, calls } = fakeClient({ fail: ["quote_items.insert"] });
    const result = await createQuoteWithItems(client, "u1", input);
    expect(result).toEqual({ error: "failed: quote_items.insert" });
    expect(ops(calls)).toEqual([
      "quotes.insert",
      "quote_items.insert",
      "quotes.delete",
    ]);
    expect(calls[2].filters).toEqual({ id: "new-1" });
  });

  it("stops if the quote itself fails", async () => {
    const { client, calls } = fakeClient({ fail: ["quotes.insert"] });
    const result = await createQuoteWithItems(client, "u1", input);
    expect(result).toEqual({ error: "failed: quotes.insert" });
    expect(ops(calls)).toEqual(["quotes.insert"]);
  });
});

describe("updateQuoteWithItems", () => {
  const rows = { quote_items: [{ id: "old-1" }, { id: "old-2" }] };

  it("adds the new lines first, then removes the old ones", async () => {
    const { client, calls } = fakeClient({ rows });
    const result = await updateQuoteWithItems(client, "q1", input);
    expect(result).toEqual({ id: "q1" });
    expect(ops(calls)).toEqual([
      "quote_items.select",
      "quotes.update",
      "quote_items.insert",
      "quote_items.delete",
    ]);
    expect(calls[3].filters).toEqual({ id: ["old-1", "old-2"] });
  });

  it("does not touch the old lines if adding the new ones fails", async () => {
    const { client, calls } = fakeClient({ rows, fail: ["quote_items.insert"] });
    const result = await updateQuoteWithItems(client, "q1", input);
    expect(result).toEqual({ error: "failed: quote_items.insert" });
    expect(ops(calls)).not.toContain("quote_items.delete");
  });

  it("takes the new lines back out if removing the old ones fails", async () => {
    const { client, calls } = fakeClient({ rows, fail: ["quote_items.delete"] });
    // First delete (old lines) fails, which triggers the clean-up delete.
    const result = await updateQuoteWithItems(client, "q1", input);
    expect(result).toEqual({ error: "failed: quote_items.delete" });
    const deletes = calls.filter((c) => c.op === "delete");
    expect(deletes[0].filters).toEqual({ id: ["old-1", "old-2"] });
    expect(deletes[1].filters).toEqual({ id: ["new-1"] });
  });

  it("keeps the old lines when the header update fails", async () => {
    const { client, calls } = fakeClient({ rows, fail: ["quotes.update"] });
    const result = await updateQuoteWithItems(client, "q1", input);
    expect(result).toEqual({ error: "failed: quotes.update" });
    expect(ops(calls)).toEqual(["quote_items.select", "quotes.update"]);
  });

  it("reports a quote that is not there (or not yours)", async () => {
    const { client, calls } = fakeClient({ rows, updateMatches: false });
    const result = await updateQuoteWithItems(client, "nope", input);
    expect(result).toEqual({ error: "That quote could not be found." });
    expect(ops(calls)).toEqual(["quote_items.select", "quotes.update"]);
  });

  it("works for a quote with no lines yet", async () => {
    const { client, calls } = fakeClient({});
    const result = await updateQuoteWithItems(client, "q1", input);
    expect(result).toEqual({ id: "q1" });
    expect(ops(calls)).not.toContain("quote_items.delete");
  });
});

describe("duplicateQuoteWithItems", () => {
  const quote = {
    id: "q1",
    customer_id: "c1",
    title: "Roof",
    client_name: "Ms. Madge",
    client_phone: "876",
    client_email: null,
    client_address: null,
    currency: "JMD",
    discount_amount: "100.00",
    tax_rate: "15.00",
    customer_view: "section_totals",
    valid_until: "2026-01-01",
    notes: "Hi",
    status: "accepted",
  };
  const lines = [
    {
      section: "labour",
      stage: "Roof",
      position: 0,
      description: "Fix",
      unit: "day",
      quantity: "2.500",
      unit_price: "5000.00",
    },
  ];

  it("copies the quote as a draft with a new title and no expiry", async () => {
    const { client, calls } = fakeClient({ rows: { quotes: [quote], quote_items: lines } });
    const result = await duplicateQuoteWithItems(client, "u1", "q1");
    expect(result).toEqual({ id: "new-1" });
    const created = calls.find((c) => c.op === "insert" && c.table === "quotes");
    expect(created?.payload).toEqual(
      expect.objectContaining({
        user_id: "u1",
        title: "Roof (copy)",
        status: "draft",
        valid_until: null,
        discount_amount: 100,
        tax_rate: 15,
        customer_view: "section_totals",
        customer_id: "c1",
      })
    );
    const copied = calls.find((c) => c.op === "insert" && c.table === "quote_items");
    expect(copied?.payload).toEqual([
      expect.objectContaining({
        quote_id: "new-1",
        quantity: 2.5,
        unit_price: 5000,
        description: "Fix",
      }),
    ]);
  });

  it("keeps the title within 200 characters", async () => {
    const long = { ...quote, title: "x".repeat(200) };
    const { client, calls } = fakeClient({ rows: { quotes: [long], quote_items: lines } });
    await duplicateQuoteWithItems(client, "u1", "q1");
    const created = calls.find((c) => c.op === "insert" && c.table === "quotes");
    const title = (created?.payload as { title: string }).title;
    expect(title.length).toBe(200);
    expect(title.endsWith(" (copy)")).toBe(true);
  });

  it("removes the copy if its lines fail to save", async () => {
    const { client, calls } = fakeClient({
      rows: { quotes: [quote], quote_items: lines },
      fail: ["quote_items.insert"],
    });
    const result = await duplicateQuoteWithItems(client, "u1", "q1");
    expect(result).toEqual({ error: "failed: quote_items.insert" });
    expect(calls[calls.length - 1]).toEqual(
      expect.objectContaining({ table: "quotes", op: "delete", filters: { id: "new-1" } })
    );
  });

  it("says so when the quote does not exist", async () => {
    const { client } = fakeClient({ rows: { quotes: [] } });
    const result = await duplicateQuoteWithItems(client, "u1", "nope");
    expect(result).toEqual({ error: "That quote could not be found." });
  });
});

describe("setQuoteStatus and removeQuote", () => {
  it("changes the status", async () => {
    const { client, calls } = fakeClient({});
    expect(await setQuoteStatus(client, "q1", "sent")).toEqual({});
    expect(calls[0].payload).toEqual({ status: "sent" });
  });

  it("reports a missing quote or a failure", async () => {
    const missing = fakeClient({ updateMatches: false });
    expect(await setQuoteStatus(missing.client, "q1", "sent")).toEqual({
      error: "That quote could not be found.",
    });
    const failing = fakeClient({ fail: ["quotes.update"] });
    expect(await setQuoteStatus(failing.client, "q1", "sent")).toEqual({
      error: "failed: quotes.update",
    });
  });

  it("deletes a quote, or reports the failure", async () => {
    const ok = fakeClient({});
    expect(await removeQuote(ok.client, "q1")).toEqual({});
    expect(ok.calls[0]).toEqual(
      expect.objectContaining({ table: "quotes", op: "delete", filters: { id: "q1" } })
    );
    const bad = fakeClient({ fail: ["quotes.delete"] });
    expect(await removeQuote(bad.client, "q1")).toEqual({ error: "failed: quotes.delete" });
  });
});
