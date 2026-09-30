"use client";

import { useActionState } from "react";
import { Field, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { initialFormState } from "@/lib/form-state";
import {
  BUSINESS_TYPES,
  BUSINESS_TYPE_LABELS,
} from "@/lib/validation/business-profile";
import type { BusinessType } from "@/types/database";
import { saveBusinessBasics } from "./actions";

export function BusinessBasicsStep({
  businessName,
  businessType,
}: {
  businessName: string;
  businessType: BusinessType;
}) {
  const [state, formAction] = useActionState(
    saveBusinessBasics,
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
          autoFocus
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

      {state.status === "error" && state.message && (
        <Alert variant="error">{state.message}</Alert>
      )}

      <SubmitButton className="w-full" pendingText="Saving…">
        Continue
      </SubmitButton>
    </form>
  );
}
