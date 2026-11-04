import { describe, expect, it } from "vitest";
import {
  createInvoiceFromQuote,
  issueInvoice,
  removeDraftInvoice,
  voidInvoice,
} from "./invoice-writes";

interface Call {
  table?: string;
  op: string;
  payload?: unknown;
  filters: Record<string, unknown>;
}

/** A tiny pretend database client that records what was asked of it. */
function fakeClient(options: {
  rpc?: { data: unknown; error: { message: string } | null };
  write?: { data: unknown[] | null; error: { message: string } | null };
}) {
  const calls: Call[] = [];

  function from(table: string) {
    const call: Call = { table, op: "select", filters: {} };
    const builder: Record<string, unknown> = {
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
      select() {
        calls.push(call);
        return Promise.resolve(options.write ?? { data: [{ id: "x" }], error: null });
      },
    };
    return builder;
  }

  const client = {
    from,
    rpc(name: string, args: unknown) {
      calls.push({ op: `rpc:${name}`, payload: args, filters: {} });
      return Promise.resolve(options.rpc ?? { data: "new-id", error: null });
    },
  };
  return { client: client as never, calls };
}

describe("createInvoiceFromQuote", () => {
  it("asks the database to copy the quote and returns the new id", async () => {
    const { client, calls } = fakeClient({});
    const result = await createInvoiceFromQuote(client, "quote-1");
    expect(result).toEqual({ id: "new-id" });
    expect(calls[0]).toMatchObject({
      op: "rpc:create_invoice_from_quote",
      payload: { p_quote_id: "quote-1" },
    });
  });

  it("passes on the database's error message", async () => {
    const { client } = fakeClient({
      rpc: {
        data: null,
        error: { message: "Only an accepted quote can be turned into an invoice." },
      },
    });
    expect(await createInvoiceFromQuote(client, "q")).toEqual({
      error: "Only an accepted quote can be turned into an invoice.",
    });
  });

  it("reports an error when nothing comes back", async () => {
    const { client } = fakeClient({ rpc: { data: null, error: null } });
    const result = await createInvoiceFromQuote(client, "q");
    expect(result.error).toBeTruthy();
  });
});

describe("issueInvoice", () => {
  it("issues only a draft, with the due date", async () => {
    const { client, calls } = fakeClient({});
    expect(await issueInvoice(client, "inv-1", "2026-12-01")).toEqual({});
    expect(calls[0]).toMatchObject({
      table: "invoices",
      op: "update",
      payload: { status: "issued", due_on: "2026-12-01" },
      filters: { id: "inv-1", status: "draft" },
    });
  });

  it("says so when it was not a draft (nothing updated)", async () => {
    const { client } = fakeClient({ write: { data: [], error: null } });
    expect((await issueInvoice(client, "inv-1", null)).error).toMatch(/draft/i);
  });

  it("passes on a database error", async () => {
    const { client } = fakeClient({
      write: { data: null, error: { message: "boom" } },
    });
    expect(await issueInvoice(client, "inv-1", null)).toEqual({ error: "boom" });
  });
});

describe("voidInvoice", () => {
  it("voids only an issued invoice and keeps the reason", async () => {
    const { client, calls } = fakeClient({});
    expect(await voidInvoice(client, "inv-1", "Wrong quantity")).toEqual({});
    expect(calls[0]).toMatchObject({
      op: "update",
      payload: { status: "void", void_reason: "Wrong quantity" },
      filters: { id: "inv-1", status: "issued" },
    });
  });

  it("says so when it was not issued", async () => {
    const { client } = fakeClient({ write: { data: [], error: null } });
    expect((await voidInvoice(client, "inv-1", null)).error).toMatch(/issued/i);
  });
});

describe("removeDraftInvoice", () => {
  it("deletes only a draft", async () => {
    const { client, calls } = fakeClient({});
    expect(await removeDraftInvoice(client, "inv-1")).toEqual({});
    expect(calls[0]).toMatchObject({
      op: "delete",
      filters: { id: "inv-1", status: "draft" },
    });
  });

  it("says so when nothing was deleted", async () => {
    const { client } = fakeClient({ write: { data: [], error: null } });
    expect((await removeDraftInvoice(client, "inv-1")).error).toMatch(/draft/i);
  });
});
