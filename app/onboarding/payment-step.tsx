"use client";

import { useActionState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { initialFormState } from "@/lib/form-state";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/validation/business-profile";
import type { PaymentMethod } from "@/types/database";
import { finishOnboarding } from "./actions";

export function PaymentStep({
  paymentMethod,
  paymentLink,
  paymentInstructions,
  includePaymentLinkDefault,
}: {
  paymentMethod: PaymentMethod | null;
  paymentLink: string | null;
  paymentInstructions: string | null;
  includePaymentLinkDefault: boolean;
}) {
  const [state, formAction] = useActionState(
    finishOnboarding,
    initialFormState
  );
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <Field
        label="Preferred payment method"
        htmlFor="payment_method"
        error={errors.payment_method?.[0]}
      >
        <Select
          id="payment_method"
          name="payment_method"
          defaultValue={paymentMethod ?? ""}
          invalid={!!errors.payment_method}
          autoFocus
        >
          <option value="">Not set</option>
          {PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>
              {PAYMENT_METHOD_LABELS[method]}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Payment link"
        htmlFor="payment_link"
        error={errors.payment_link?.[0]}
        hint="For PayPal, GripBill pre-fills the amount owed for you. Don't have one yet? A free PayPal.me link takes about 2 minutes to set up."
      >
        <Input
          id="payment_link"
          name="payment_link"
          defaultValue={paymentLink ?? ""}
          invalid={!!errors.payment_link}
          placeholder="https://paypal.me/BrownRenovations"
        />
      </Field>

      <Field
        label="Payment instructions"
        htmlFor="payment_instructions"
        error={errors.payment_instructions?.[0]}
        hint="Optional — shown to you as a reminder, not sent in messages yet."
      >
        <Textarea
          id="payment_instructions"
          name="payment_instructions"
          defaultValue={paymentInstructions ?? ""}
          invalid={!!errors.payment_instructions}
          rows={2}
          placeholder="Please include the job reference when making payment."
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          name="include_payment_link_default"
          defaultChecked={includePaymentLinkDefault}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        Include payment link in message drafts by default
      </label>

      <p className="text-xs text-gray-400">
        You can skip this and add it later from Settings — everything else
        you&apos;ve entered is already saved either way.
      </p>

      {state.status === "error" && state.message && (
        <Alert variant="error">{state.message}</Alert>
      )}

      <SubmitButton className="w-full" pendingText="Finishing…">
        Finish
      </SubmitButton>
    </form>
  );
}
