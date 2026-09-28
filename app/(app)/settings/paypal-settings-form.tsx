"use client";

import { useActionState } from "react";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { initialFormState } from "@/lib/form-state";
import { updatePaypalUsername } from "./actions";

export function PaypalSettingsForm({
  currentUsername,
}: {
  currentUsername: string | null;
}) {
  const [state, formAction] = useActionState(
    updatePaypalUsername,
    initialFormState
  );

  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <Field
        label="PayPal.me username"
        htmlFor="paypal_username"
        error={errors.paypal_username?.[0]}
        hint="Don't have one yet? Create a free one at paypal.me — it takes about 2 minutes."
      >
        <Input
          id="paypal_username"
          name="paypal_username"
          defaultValue={currentUsername ?? ""}
          invalid={!!errors.paypal_username}
          placeholder="jordansmith"
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
