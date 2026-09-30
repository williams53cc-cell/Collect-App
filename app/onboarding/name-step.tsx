"use client";

import { useActionState } from "react";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { initialFormState } from "@/lib/form-state";
import { saveName } from "./actions";

export function NameStep({
  firstName,
  lastName,
}: {
  firstName: string;
  lastName: string;
}) {
  const [state, formAction] = useActionState(saveName, initialFormState);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <Field
        label="First name"
        htmlFor="first_name"
        required
        error={errors.first_name?.[0]}
      >
        <Input
          id="first_name"
          name="first_name"
          defaultValue={firstName}
          invalid={!!errors.first_name}
          autoComplete="given-name"
          autoFocus
        />
      </Field>

      <Field
        label="Last name"
        htmlFor="last_name"
        required
        error={errors.last_name?.[0]}
      >
        <Input
          id="last_name"
          name="last_name"
          defaultValue={lastName}
          invalid={!!errors.last_name}
          autoComplete="family-name"
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
