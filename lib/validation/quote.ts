import { z } from "zod";
import {
  QUOTE_CUSTOMER_VIEWS,
  QUOTE_SECTIONS,
  QUOTE_SECTION_LABELS,
  calculateQuoteTotals,
  lineAmount,
} from "@/lib/quotes";
import type { QuoteCustomerView, QuoteSection } from "@/types/database";

/** Biggest amount the database columns can hold (numeric(14,2)). */
export const MAX_AMOUNT = 999_999_999_999.99;
export const MAX_QUANTITY = 99_999_999;
export const MAX_UNIT_PRICE = 999_999_999.99;
export const MAX_ITEMS = 200;

export interface QuoteItemInput {
  section: QuoteSection;
  stage: string | null;
  position: number;
  description: string;
  unit: string | null;
  quantity: number;
  unit_price: number;
}

export interface QuoteInput {
  title: string;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  client_address: string | null;
  customer_id: string | null;
  customer_view: QuoteCustomerView;
  valid_until: string | null;
  notes: string | null;
  discount_amount: number;
  tax_rate: number;
  items: QuoteItemInput[];
}

export type ParseQuoteResult =
  | { success: true; data: QuoteInput }
  | { success: false; errors: Record<string, string[]> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const headerSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give the quote a title.")
    .max(200, "Title must be 200 characters or fewer."),
  client_name: z
    .string()
    .trim()
    .min(1, "Client name is required.")
    .max(200, "Client name must be 200 characters or fewer."),
  client_phone: z
    .string()
    .trim()
    .max(50, "Phone must be 50 characters or fewer."),
  client_email: z
    .string()
    .trim()
    .max(200, "Email must be 200 characters or fewer.")
    .refine(
      (value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      "Enter a valid email address."
    ),
  client_address: z
    .string()
    .trim()
    .max(300, "Address must be 300 characters or fewer."),
  customer_id: z
    .string()
    .trim()
    .refine((value) => value === "" || UUID.test(value), "Choose a valid customer."),
  customer_view: z.enum(QUOTE_CUSTOMER_VIEWS, {
    errorMap: () => ({ message: "Choose how the customer sees the quote." }),
  }),
  valid_until: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        (/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))),
      "Enter a valid date."
    ),
  notes: z.string().trim().max(2000, "Notes must be 2000 characters or fewer."),
});

/** Reads a typed-in number. Returns `undefined` for an empty box and `null`
 * for something that is not a plain non-negative number. Commas and spaces
 * are allowed ("1,500.50"). */
export function parseDecimal(raw: unknown): number | null | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw >= 0 ? raw : null;
  }
  if (typeof raw !== "string") return null;
  const text = raw.replace(/[,\s]/g, "");
  if (text === "") return undefined;
  if (!/^(\d+\.?\d*|\.\d+)$/.test(text)) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

const round2 = (value: number) => Math.round(value * 100) / 100;
const round3 = (value: number) => Math.round(value * 1000) / 1000;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function addError(
  errors: Record<string, string[]>,
  key: string,
  message: string
) {
  (errors[key] ??= []).push(message);
}

interface ParsedItems {
  items: QuoteItemInput[];
}

function parseItems(
  raw: unknown,
  errors: Record<string, string[]>
): ParsedItems {
  const items: QuoteItemInput[] = [];

  let list: unknown;
  try {
    list = typeof raw === "string" ? JSON.parse(raw) : null;
  } catch {
    list = null;
  }
  if (!Array.isArray(list)) {
    addError(
      errors,
      "items",
      "The line items could not be read. Reload the page and try again."
    );
    return { items };
  }
  if (list.length > MAX_ITEMS) {
    addError(errors, "items", `A quote can have at most ${MAX_ITEMS} lines.`);
    return { items };
  }

  const seen: Record<QuoteSection, number> = {
    materials: 0,
    labour: 0,
    extras: 0,
  };

  for (const entry of list) {
    const row = (entry ?? {}) as Record<string, unknown>;
    const section = row.section;
    if (
      typeof section !== "string" ||
      !(QUOTE_SECTIONS as readonly string[]).includes(section)
    ) {
      addError(errors, "items", "A line has an unknown section.");
      continue;
    }
    const sec = section as QuoteSection;
    seen[sec] += 1;
    const label = `${QUOTE_SECTION_LABELS[sec]} line ${seen[sec]}`;

    const description = text(row.description);
    const stage = text(row.stage);
    const unit = text(row.unit);
    const quantityRaw = parseDecimal(row.quantity);
    const priceRaw = parseDecimal(row.unit_price);

    // A row nobody typed anything into is just ignored.
    const untouched =
      description === "" &&
      stage === "" &&
      unit === "" &&
      (priceRaw === undefined || priceRaw === 0);
    if (untouched) continue;

    let ok = true;
    const problem = (message: string) => {
      addError(errors, "items", `${label}: ${message}`);
      ok = false;
    };

    if (description === "") problem("add a description.");
    else if (description.length > 300)
      problem("description must be 300 characters or fewer.");
    if (stage.length > 100) problem("stage must be 100 characters or fewer.");
    if (unit.length > 30) problem("unit must be 30 characters or fewer.");

    if (quantityRaw === undefined) problem("enter a quantity.");
    else if (quantityRaw === null) problem("quantity must be a number.");
    else if (quantityRaw <= 0) problem("quantity must be more than 0.");
    else if (quantityRaw > MAX_QUANTITY) problem("quantity is too large.");

    if (priceRaw === undefined) problem("enter a unit price (0 if it is free).");
    else if (priceRaw === null) problem("unit price must be a number.");
    else if (priceRaw > MAX_UNIT_PRICE) problem("unit price is too large.");

    if (!ok) continue;

    const quantity = round3(quantityRaw as number);
    const unitPrice = round2(priceRaw as number);
    if (quantity <= 0) {
      problem("quantity must be at least 0.001.");
      continue;
    }
    if (lineAmount(quantity, unitPrice) > MAX_AMOUNT) {
      problem("the amount is too large.");
      continue;
    }

    items.push({
      section: sec,
      stage: stage || null,
      position: items.length,
      description,
      unit: unit || null,
      quantity,
      unit_price: unitPrice,
    });
  }

  return { items };
}

/** Reads and checks everything the quote form sends. Line items arrive as
 * JSON in one hidden field called `items_json`. Nothing is trusted: the
 * totals are never read from the form, they are always worked out again. */
export function parseQuoteForm(formData: FormData): ParseQuoteResult {
  const get = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
  };

  const errors: Record<string, string[]> = {};

  const header = headerSchema.safeParse({
    title: get("title"),
    client_name: get("client_name"),
    client_phone: get("client_phone"),
    client_email: get("client_email"),
    client_address: get("client_address"),
    customer_id: get("customer_id"),
    customer_view: get("customer_view") || "detailed",
    valid_until: get("valid_until"),
    notes: get("notes"),
  });
  if (!header.success) {
    for (const [key, messages] of Object.entries(
      header.error.flatten().fieldErrors
    )) {
      if (messages) errors[key] = messages;
    }
  }

  let discount = 0;
  const discountRaw = parseDecimal(get("discount_amount"));
  if (discountRaw === null) {
    addError(errors, "discount_amount", "Discount must be a number.");
  } else if (discountRaw !== undefined) {
    if (discountRaw > MAX_AMOUNT) {
      addError(errors, "discount_amount", "Discount is too large.");
    } else {
      discount = round2(discountRaw);
    }
  }

  let taxRate = 0;
  const taxRaw = parseDecimal(get("tax_rate"));
  if (taxRaw === null) {
    addError(errors, "tax_rate", "Tax rate must be a number.");
  } else if (taxRaw !== undefined) {
    if (taxRaw > 100) {
      addError(errors, "tax_rate", "Tax rate cannot be more than 100%.");
    } else {
      taxRate = round2(taxRaw);
    }
  }

  const { items } = parseItems(formData.get("items_json"), errors);
  if (items.length === 0 && !errors.items) {
    addError(errors, "items", "Add at least one line to the quote.");
  }

  if (items.length > 0) {
    const totals = calculateQuoteTotals(items.map(toLine), discount, taxRate);
    if (totals.total > MAX_AMOUNT || totals.subtotal > MAX_AMOUNT) {
      addError(errors, "items", "The quote total is too large.");
    }
  }

  if (!header.success || Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  const h = header.data;
  return {
    success: true,
    data: {
      title: h.title,
      client_name: h.client_name,
      client_phone: h.client_phone || null,
      client_email: h.client_email || null,
      client_address: h.client_address || null,
      customer_id: h.customer_id || null,
      customer_view: h.customer_view as QuoteCustomerView,
      valid_until: h.valid_until || null,
      notes: h.notes || null,
      discount_amount: discount,
      tax_rate: taxRate,
      items,
    },
  };
}

function toLine(item: QuoteItemInput) {
  return {
    section: item.section,
    quantity: item.quantity,
    unitPrice: item.unit_price,
  };
}
