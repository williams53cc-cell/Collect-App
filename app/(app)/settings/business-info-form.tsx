"use client";

import { useActionState } from "react";
import { Field, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { initialFormState } from "@/lib/form-state";
import {
  BUSINESS_TYPES,
  BUSINESS_TYPE_LABELS,
  CURRENCIES,
  CURRENCY_LABELS,
} from "@/lib/validation/business-profile";
import type { BusinessType } from "@/types/database";
import { updateBusinessInfo } from "./actions";

export function BusinessInfoForm({
  businessName,
  businessType,
  currency,
  country,
  timezone,
}: {
  businessName: string;
  businessType: BusinessType;
  currency: string;
  country: string | null;
  timezone: string | null;
}) {
  const [state, formAction] = useActionState(
    updateBusinessInfo,
    initialFormState
  );

  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <Field
        label="Business name"
        htmlFor="business_name"
        required
        error={errors.business_name?.[0]}
        hint="This is what shows up on your drafted messages — e.g. “Thanks, Brown Renovations” instead of “Thanks, GripBill.”"
      >
        <Input
          id="business_name"
          name="business_name"
          defaultValue={businessName}
          invalid={!!errors.business_name}
          placeholder="Brown Renovations"
        />
      </Field>

      <Field
        label="Business type"
        htmlFor="business_type"
        error={errors.business_type?.[0]}
      >
        <Select
          id="business_type"
          name="business_type"
          defaultValue={businessType}
          invalid={!!errors.business_type}
        >
          {BUSINESS_TYPES.map((type) => (
            <option key={type} value={type}>
              {BUSINESS_TYPE_LABELS[type]}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Default currency"
        htmlFor="currency"
        error={errors.currency?.[0]}
        hint="Used on every payment you add, so you don't have to pick it each time."
      >
        <Select
          id="currency"
          name="currency"
          defaultValue={currency}
          invalid={!!errors.currency}
        >
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {CURRENCY_LABELS[code]}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Country or region"
        htmlFor="country"
        error={errors.country?.[0]}
      >
        <Input
          id="country"
          name="country"
          defaultValue={country ?? ""}
          invalid={!!errors.country}
          placeholder="United States"
        />
      </Field>

      <Field
        label="Time zone"
        htmlFor="timezone"
        error={errors.timezone?.[0]}
        hint="Keeps due dates and “due today” accurate for where you work."
      >
        <Input
          id="timezone"
          name="timezone"
          defaultValue={timezone ?? ""}
          invalid={!!errors.timezone}
          placeholder="America/New_York"
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
