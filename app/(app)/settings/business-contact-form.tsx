"use client";

import { useActionState } from "react";
import { Field, Input, Textarea } from "@/components/ui/field";
import { PhoneInput } from "@/components/ui/phone-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { initialFormState } from "@/lib/form-state";
import { updateBusinessContact } from "./contact-actions";

export function BusinessContactForm({
  phone,
  email,
  address,
  terms,
}: {
  phone: string | null;
  email: string | null;
  address: string | null;
  terms: string | null;
}) {
  const [state, formAction] = useActionState(
    updateBusinessContact,
    initialFormState
  );

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
          placeholder="Ackles Hill, Kitson Town, St. Catherine"
        />
      </Field>

      <Field
        label="Terms on your quotes"
        htmlFor="quote_terms"
        error={errors.quote_terms?.[0]}
        hint="Printed at the bottom of every quote."
      >
        <Textarea
          id="quote_terms"
          name="quote_terms"
          defaultValue={terms ?? ""}
          invalid={!!errors.quote_terms}
          rows={4}
          placeholder="50% deposit before work starts. Balance on completion. Prices valid for 30 days."
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
