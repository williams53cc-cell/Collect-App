"use client";

import { useActionState } from "react";
import { Field, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { initialFormState } from "@/lib/form-state";
import { CURRENCIES, CURRENCY_LABELS } from "@/lib/validation/business-profile";
import { saveBusinessDetails } from "./actions";

export function BusinessDetailsStep({
  currency,
  country,
  timezone,
}: {
  currency: string;
  country: string | null;
  timezone: string | null;
}) {
  const [state, formAction] = useActionState(
    saveBusinessDetails,
    initialFormState
  );
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-4">
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
          autoFocus
        >
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {CURRENCY_LABELS[code]}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Country or region" htmlFor="country" error={errors.country?.[0]}>
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

      {state.status === "error" && state.message && (
        <Alert variant="error">{state.message}</Alert>
      )}

      <SubmitButton className="w-full" pendingText="Saving…">
        Continue
      </SubmitButton>
    </form>
  );
}
