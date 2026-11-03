import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  user: { id: "u1" } as { id: string } | null,
  quote: null as unknown,
  profile: null as unknown,
}));

vi.mock("@/utils/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
  }),
}));
vi.mock("@/lib/data/quotes", () => ({ getQuote: async () => state.quote }));
vi.mock("@/lib/data/business-profile", () => ({
  getBusinessProfile: async () => state.profile,
}));

import { GET } from "./route";

const ID = "6f1c2a9e-3b4d-4e5f-8a7b-9c0d1e2f3a4b";

const quote = {
  id: ID,
  quote_number: 7,
  title: "Roof",
  client_name: "Ms. Brown",
  client_phone: null,
  client_email: null,
  client_address: null,
  currency: "JMD",
  tax_rate: 0,
  customer_view: "detailed",
  valid_until: null,
  notes: null,
  created_at: "2026-11-04T02:30:00Z",
  items: [
    {
      section: "labour",
      stage: null,
      description: "Fix roof",
      unit: "day",
      quantity: 2,
      unit_price: 5000,
      amount: 10000,
    },
  ],
  totals: {
    materials_total: 0,
    labour_total: 10000,
    extras_total: 0,
    subtotal: 10000,
    discount_amount: 0,
    tax_amount: 0,
    total: 10000,
  },
};

function call(id: string, query = "") {
  return GET(new Request(`http://localhost/quotes/${id}/pdf${query}`), {
    params: Promise.resolve({ id }),
  });
}

beforeEach(() => {
  state.user = { id: "u1" };
  state.quote = quote;
  state.profile = null;
});

describe("GET /quotes/[id]/pdf", () => {
  it("returns the quote as a PDF shown in the browser", async () => {
    const response = await call(ID);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toBe(
      'inline; filename="Q-0007-Ms-Brown.pdf"'
    );
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
  });

  it("downloads instead when asked", async () => {
    const response = await call(ID, "?download=1");
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="Q-0007-Ms-Brown.pdf"'
    );
  });

  it("refuses someone who is not signed in", async () => {
    state.user = null;
    expect((await call(ID)).status).toBe(401);
  });

  it("says not found for a quote that is not theirs or does not exist", async () => {
    state.quote = null;
    expect((await call(ID)).status).toBe(404);
  });

  it("says not found for an id that is not an id", async () => {
    expect((await call("pdf")).status).toBe(404);
  });
});
