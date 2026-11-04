"use client";

import { useActionState, useState } from "react";
import { Field, Input, Textarea } from "@/components/ui/field";
import { PhoneInput } from "@/components/ui/phone-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { initialFormState } from "@/lib/form-state";
import { hasTerm, TERM_OPTIONS, toggleTerm } from "@/lib/quote-terms";
import { updateBusinessContact } from "./contact-actions";

export function BusinessContactForm({
  phone,
  email,
  address,
  terms,
  trn,
  gctNumber,
}: {
  phone: string | null;
  email: string | null;
  address: string | null;
  terms: string | null;
  trn: string | null;
  gctNumber: string | null;
}) {
  const [state, formAction] = useActionState(
    updateBusinessContact,
    initialFormState
  );

  const [termsText, setTermsText] = useState(terms ?? "");

  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <Field
        label="Business phone"
        htmlFor="business_phone"
        error={errors.business_phone?.[0]}
      >
        <PhoneInput
          id="business_phone"
          name="business_phone"
          defaultValue={phone ?? ""}
          invalid={!!errors.business_phone}
          placeholder="(876) 555-1234"
        />
      </Field>

      <Field
        label="Business email"
        htmlFor="business_email"
        error={errors.business_email?.[0]}
      >
        <Input
          id="business_email"
          name="business_email"
          type="email"
          defaultValue={email ?? ""}
          invalid={!!errors.business_email}
          placeholder="name@example.com"
        />
      </Field>

      <Field
        label="Business address"
        htmlFor="business_address"
        error={errors.business_address?.[0]}
        hint="Town and parish is enough if you work from home."
      >
        <Textarea
          id="business_address"
          name="business_address"
          defaultValue={address ?? ""}
          invalid={!!errors.business_address}
          rows={2}
          placeholder="12 Main Street, Spanish Town, St. Catherine"
        />
      </Field>

      <details
        className="rounded-md border border-gray-200 px-3 py-2"
        open={!!(trn || gctNumber || errors.trn || errors.gct_number)}
      >
        <summary className="cursor-pointer text-sm font-medium text-gray-700">
          Tax numbers (optional)
        </summary>
        <div className="mt-3 space-y-4">
          <p className="text-sm text-gray-500">
            Most small contractors leave these empty. Nothing is printed unless
            you fill it in. Only add them if a customer or your accountant asks
            you to show them.
          </p>

          <Field
            label="TRN (Taxpayer Registration Number)"
            htmlFor="trn"
            error={errors.trn?.[0]}
          >
            <Input
              id="trn"
              name="trn"
              inputMode="numeric"
              defaultValue={trn ?? ""}
              invalid={!!errors.trn}
              placeholder="000-000-000"
            />
          </Field>

          <Field
            label="GCT registration number"
            htmlFor="gct_number"
            error={errors.gct_number?.[0]}
            hint="Only if you are registered for GCT."
          >
            <Input
              id="gct_number"
              name="gct_number"
              defaultValue={gctNumber ?? ""}
              invalid={!!errors.gct_number}
              placeholder="Your GCT number"
            />
          </Field>
        </div>
      </details>

      <Field
        label="Terms on your quotes"
        htmlFor="quote_terms"
        error={errors.quote_terms?.[0]}
        hint="Printed at the bottom of every quote. Tap a line to add it, tap again to remove it, or type your own."
      >
        <div className="mb-2 flex flex-wrap gap-2">
          {TERM_OPTIONS.map((term) => {
            const active = hasTerm(termsText, term);
            return (
              <button
                key={term}
                type="button"
                aria-pressed={active}
                onClick={() => setTermsText(toggleTerm(termsText, term))}
                className={`rounded-full border px-3 py-1.5 text-left text-sm ${
                  active
                    ? "border-blue-600 bg-blue-50 font-medium text-blue-700"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {active ? "✓ " : "+ "}
                {term}
              </button>
            );
          })}
        </div>
        <Textarea
          id="quote_terms"
          name="quote_terms"
          value={termsText}
          onChange={(event) => setTermsText(event.target.value)}
          invalid={!!errors.quote_terms}
          rows={5}
          placeholder="Tap a line above, or type your own terms here."
        />
      </Field>

      {state.status === "success" && state.message && (
        <Alert variant="success">{state.message}</Alert>
      )}
      {state.status === "error" && state.message && (
        <Alert variant="error">{state.message}</Alert>
      )}

      <SubmitButton>Save</SubmitButton>
    </form>
  );
}
