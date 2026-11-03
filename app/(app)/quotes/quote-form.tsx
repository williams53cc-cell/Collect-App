"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatCurrency } from "@/lib/format";
import { initialFormState } from "@/lib/form-state";
import {
  QUOTE_CUSTOMER_VIEWS,
  QUOTE_CUSTOMER_VIEW_LABELS,
  QUOTE_SECTIONS,
  QUOTE_SECTION_LABELS,
  calculateQuoteTotals,
  lineAmount,
} from "@/lib/quotes";
import { parseDecimal } from "@/lib/validation/quote";
import type { QuoteCustomerView, QuoteSection } from "@/types/database";
import { createQuote, updateQuote } from "./actions";

export interface QuoteFormCustomer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

export interface QuoteFormInitial {
  title: string;
  client_name: string;
  client_phone: string;
  client_email: string;
  client_address: string;
  customer_id: string;
  customer_view: QuoteCustomerView;
  valid_until: string;
  notes: string;
  discount_amount: string;
  tax_rate: string;
  items: {
    section: QuoteSection;
    stage: string;
    description: string;
    unit: string;
    quantity: string;
    unit_price: string;
  }[];
}

interface Row {
  key: number;
  section: QuoteSection;
  stage: string;
  description: string;
  unit: string;
  quantity: string;
  unit_price: string;
}

const EMPTY_INITIAL: QuoteFormInitial = {
  title: "",
  client_name: "",
  client_phone: "",
  client_email: "",
  client_address: "",
  customer_id: "",
  customer_view: "detailed",
  valid_until: "",
  notes: "",
  discount_amount: "",
  tax_rate: "",
  items: [],
};

const VIEW_HINTS: Record<QuoteCustomerView, string> = {
  detailed: "Your client sees every material, labour and extra line.",
  section_totals:
    "Your client sees one total each for materials, labour and extras.",
};

const SECTION_HINTS: Record<QuoteSection, string> = {
  materials: "Cement, blocks, steel, sand, paint...",
  labour: "Block laying, plastering, steel tying...",
  extras: "Transport, skip hire, permits, equipment...",
};

function toNumber(value: string): number {
  const parsed = parseDecimal(value);
  return typeof parsed === "number" ? parsed : 0;
}

export function QuoteForm({
  mode,
  quoteId,
  customers,
  initial = EMPTY_INITIAL,
}: {
  mode: "create" | "edit";
  quoteId?: string;
  customers: QuoteFormCustomer[];
  initial?: QuoteFormInitial;
}) {
  const action =
    mode === "edit" && quoteId ? updateQuote.bind(null, quoteId) : createQuote;
  const [state, formAction] = useActionState(action, initialFormState);
  const errors = state.errors ?? {};

  const nextKey = useRef(0);
  const makeRow = (
    section: QuoteSection,
    values: Partial<Omit<Row, "key" | "section">> = {}
  ): Row => ({
    key: nextKey.current++,
    section,
    stage: "",
    description: "",
    unit: "",
    quantity: "1",
    unit_price: "",
    ...values,
  });

  const [rows, setRows] = useState<Row[]>(() =>
    initial.items.length > 0
      ? initial.items.map((item) => makeRow(item.section, item))
      : QUOTE_SECTIONS.map((section) => makeRow(section))
  );

  const [title, setTitle] = useState(initial.title);
  const [clientName, setClientName] = useState(initial.client_name);
  const [clientPhone, setClientPhone] = useState(initial.client_phone);
  const [clientEmail, setClientEmail] = useState(initial.client_email);
  const [clientAddress, setClientAddress] = useState(initial.client_address);
  const [customerId, setCustomerId] = useState(initial.customer_id);
  const [customerView, setCustomerView] = useState(initial.customer_view);
  const [validUntil, setValidUntil] = useState(initial.valid_until);
  const [notes, setNotes] = useState(initial.notes);
  const [discount, setDiscount] = useState(initial.discount_amount);
  const [taxRate, setTaxRate] = useState(initial.tax_rate);

  const totals = useMemo(
    () =>
      calculateQuoteTotals(
        rows.map((row) => ({
          section: row.section,
          quantity: toNumber(row.quantity),
          unitPrice: toNumber(row.unit_price),
        })),
        toNumber(discount),
        toNumber(taxRate)
      ),
    [rows, discount, taxRate]
  );

  const stages = useMemo(
    () =>
      Array.from(
        new Set(rows.map((row) => row.stage.trim()).filter(Boolean))
      ),
    [rows]
  );

  function updateRow(key: number, values: Partial<Row>) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...values } : row))
    );
  }

  function removeRow(key: number) {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  function pickCustomer(id: string) {
    setCustomerId(id);
    const customer = customers.find((entry) => entry.id === id);
    if (!customer) return;
    setClientName(customer.name);
    setClientPhone(customer.phone ?? "");
    setClientEmail(customer.email ?? "");
  }

  const itemsJson = JSON.stringify(
    QUOTE_SECTIONS.flatMap((section) =>
      rows
        .filter((row) => row.section === section)
        .map(({ section: s, stage, description, unit, quantity, unit_price }) => ({
          section: s,
          stage,
          description,
          unit,
          quantity,
          unit_price,
        }))
    )
  );

  const sectionTotal: Record<QuoteSection, number> = {
    materials: totals.materials,
    labour: totals.labour,
    extras: totals.extras,
  };

  const lineErrors = errors.items ?? [];

  return (
    <form action={formAction} className="space-y-6">
      {state.status === "error" && state.message && (
        <Alert variant="error">{state.message}</Alert>
      )}
      {state.status === "success" && state.message && (
        <Alert variant="success">{state.message}</Alert>
      )}

      <Card className="space-y-4 p-4 sm:p-6">
        <h2 className="text-base font-semibold">Job and client</h2>

        <Field
          label="Quote title"
          htmlFor="title"
          required
          error={errors.title?.[0]}
        >
          <Input
            id="title"
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            invalid={!!errors.title}
            placeholder="Two-bedroom house, block and steel"
          />
        </Field>

        {customers.length > 0 && (
          <Field
            label="Existing customer"
            htmlFor="customer_picker"
            hint="Optional. Picking one fills in the name, phone and email below."
            error={errors.customer_id?.[0]}
          >
            <Select
              id="customer_picker"
              value={customerId}
              onChange={(event) => pickCustomer(event.target.value)}
            >
              <option value="">Not linked to a customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <input type="hidden" name="customer_id" value={customerId} />

        <Field
          label="Client name"
          htmlFor="client_name"
          required
          error={errors.client_name?.[0]}
        >
          <Input
            id="client_name"
            name="client_name"
            value={clientName}
            onChange={(event) => setClientName(event.target.value)}
            invalid={!!errors.client_name}
            placeholder="Ms. Brown"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Phone"
            htmlFor="client_phone"
            error={errors.client_phone?.[0]}
          >
            <Input
              id="client_phone"
              name="client_phone"
              type="tel"
              value={clientPhone}
              onChange={(event) => setClientPhone(event.target.value)}
              invalid={!!errors.client_phone}
              placeholder="876-555-0100"
            />
          </Field>
          <Field
            label="Email"
            htmlFor="client_email"
            error={errors.client_email?.[0]}
          >
            <Input
              id="client_email"
              name="client_email"
              type="email"
              value={clientEmail}
              onChange={(event) => setClientEmail(event.target.value)}
              invalid={!!errors.client_email}
            />
          </Field>
        </div>

        <Field
          label="Job address"
          htmlFor="client_address"
          error={errors.client_address?.[0]}
        >
          <Input
            id="client_address"
            name="client_address"
            value={clientAddress}
            onChange={(event) => setClientAddress(event.target.value)}
            invalid={!!errors.client_address}
          />
        </Field>

        <Field
          label="Valid until"
          htmlFor="valid_until"
          hint="Optional. After this date the quote shows as expired."
          error={errors.valid_until?.[0]}
        >
          <Input
            id="valid_until"
            name="valid_until"
            type="date"
            value={validUntil}
            onChange={(event) => setValidUntil(event.target.value)}
            invalid={!!errors.valid_until}
          />
        </Field>
      </Card>

      {lineErrors.length > 0 && (
        <Alert variant="error">
          <ul className="list-inside list-disc space-y-0.5">
            {lineErrors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </Alert>
      )}

      <datalist id="quote-stages">
        {stages.map((stage) => (
          <option key={stage} value={stage} />
        ))}
      </datalist>

      {QUOTE_SECTIONS.map((section) => {
        const sectionRows = rows.filter((row) => row.section === section);
        return (
          <Card key={section} className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">
                  {QUOTE_SECTION_LABELS[section]}
                </h2>
                <p className="text-xs text-gray-400">{SECTION_HINTS[section]}</p>
              </div>
              <p className="text-sm font-semibold tabular-nums">
                {formatCurrency(sectionTotal[section])}
              </p>
            </div>

            <div className="mt-4 space-y-4">
              {sectionRows.length === 0 && (
                <p className="text-sm text-gray-400">No lines yet.</p>
              )}
              {sectionRows.map((row, index) => (
                <div
                  key={row.key}
                  className="space-y-3 rounded-md border border-gray-200 bg-gray-50/50 p-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium uppercase text-gray-400">
                      Line {index + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeRow(row.key)}
                      className="text-xs text-gray-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>

                  <Input
                    aria-label={`${QUOTE_SECTION_LABELS[section]} line ${index + 1} description`}
                    value={row.description}
                    onChange={(event) =>
                      updateRow(row.key, { description: event.target.value })
                    }
                    placeholder="Description"
                  />

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">
                        Quantity
                      </label>
                      <Input
                        inputMode="decimal"
                        value={row.quantity}
                        onChange={(event) =>
                          updateRow(row.key, { quantity: event.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">
                        Unit
                      </label>
                      <Input
                        value={row.unit}
                        onChange={(event) =>
                          updateRow(row.key, { unit: event.target.value })
                        }
                        placeholder="bag, day"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">
                        Unit price
                      </label>
                      <Input
                        inputMode="decimal"
                        value={row.unit_price}
                        onChange={(event) =>
                          updateRow(row.key, { unit_price: event.target.value })
                        }
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <label className="mb-1 block text-xs text-gray-500">
                        Stage (optional)
                      </label>
                      <Input
                        list="quote-stages"
                        value={row.stage}
                        onChange={(event) =>
                          updateRow(row.key, { stage: event.target.value })
                        }
                        placeholder="Foundation, walls, roof..."
                      />
                    </div>
                    <p className="pb-2 text-sm font-semibold tabular-nums">
                      {formatCurrency(
                        lineAmount(
                          toNumber(row.quantity),
                          toNumber(row.unit_price)
                        )
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => setRows((current) => [...current, makeRow(section)])}
            >
              Add {QUOTE_SECTION_LABELS[section].toLowerCase()} line
            </Button>
          </Card>
        );
      })}

      <Card className="space-y-4 p-4 sm:p-6">
        <h2 className="text-base font-semibold">Totals</h2>

        <dl className="space-y-2 text-sm">
          {QUOTE_SECTIONS.map((section) => (
            <div key={section} className="flex justify-between">
              <dt className="text-gray-500">{QUOTE_SECTION_LABELS[section]}</dt>
              <dd className="tabular-nums">
                {formatCurrency(sectionTotal[section])}
              </dd>
            </div>
          ))}
          <div className="flex justify-between border-t border-gray-100 pt-2">
            <dt className="font-medium">Subtotal</dt>
            <dd className="font-medium tabular-nums">
              {formatCurrency(totals.subtotal)}
            </dd>
          </div>
        </dl>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Discount (amount)"
            htmlFor="discount_amount"
            hint="Taken off before tax."
            error={errors.discount_amount?.[0]}
          >
            <Input
              id="discount_amount"
              name="discount_amount"
              inputMode="decimal"
              value={discount}
              onChange={(event) => setDiscount(event.target.value)}
              invalid={!!errors.discount_amount}
              placeholder="0.00"
            />
          </Field>
          <Field
            label="Tax rate (%)"
            htmlFor="tax_rate"
            hint="Leave empty for no tax."
            error={errors.tax_rate?.[0]}
          >
            <Input
              id="tax_rate"
              name="tax_rate"
              inputMode="decimal"
              value={taxRate}
              onChange={(event) => setTaxRate(event.target.value)}
              invalid={!!errors.tax_rate}
              placeholder="0"
            />
          </Field>
        </div>

        <dl className="space-y-2 text-sm">
          {totals.discount > 0 && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Discount</dt>
              <dd className="tabular-nums">-{formatCurrency(totals.discount)}</dd>
            </div>
          )}
          {totals.tax > 0 && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Tax</dt>
              <dd className="tabular-nums">{formatCurrency(totals.tax)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-200 pt-2 text-base">
            <dt className="font-semibold">Total</dt>
            <dd className="font-semibold tabular-nums">
              {formatCurrency(totals.total)}
            </dd>
          </div>
        </dl>
      </Card>

      <Card className="space-y-4 p-4 sm:p-6">
        <h2 className="text-base font-semibold">What your client sees</h2>
        <div className="space-y-3">
          {QUOTE_CUSTOMER_VIEWS.map((view) => (
            <label key={view} className="flex cursor-pointer items-start gap-3">
              <input
                type="radio"
                name="customer_view"
                value={view}
                checked={customerView === view}
                onChange={() => setCustomerView(view)}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium">
                  {QUOTE_CUSTOMER_VIEW_LABELS[view]}
                </span>
                <span className="block text-xs text-gray-400">
                  {VIEW_HINTS[view]}
                </span>
              </span>
            </label>
          ))}
        </div>
        {errors.customer_view?.[0] && (
          <p className="text-xs text-red-600" role="alert">
            {errors.customer_view[0]}
          </p>
        )}

        <Field
          label="Notes"
          htmlFor="notes"
          hint="Payment terms, what is not included, anything your client should know."
          error={errors.notes?.[0]}
        >
          <Textarea
            id="notes"
            name="notes"
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            invalid={!!errors.notes}
          />
        </Field>
      </Card>

      <input type="hidden" name="items_json" value={itemsJson} />

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          Total{" "}
          <span className="font-semibold tabular-nums text-gray-900">
            {formatCurrency(totals.total)}
          </span>
        </p>
        <SubmitButton pendingText="Saving…">
          {mode === "edit" ? "Save changes" : "Create quote"}
        </SubmitButton>
      </div>
    </form>
  );
}
