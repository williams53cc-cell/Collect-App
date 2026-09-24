"use client";

import { useActionState, useEffect, useRef } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { FOLLOW_UP_STATUSES, formatStatusLabel } from "@/lib/validation/follow-up";
import { initialFormState } from "@/lib/form-state";
import { createFollowUp } from "../../follow-ups/actions";

export function NewFollowUpForm({ customerId }: { customerId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const boundAction = createFollowUp.bind(null, customerId);
  const [state, formAction] = useActionState(boundAction, initialFormState);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  const errors = state.errors ?? {};

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <Field
        label="Reason"
        htmlFor="reason"
        required
        error={errors.reason?.[0]}
        className="sm:col-span-2"
      >
        <Input
          id="reason"
          name="reason"
          required
          invalid={!!errors.reason}
          placeholder="Call about invoice #204"
        />
      </Field>
      <Field
        label="Due date"
        htmlFor="due_date"
        required
        error={errors.due_date?.[0]}
      >
        <Input
          id="due_date"
          name="due_date"
          type="date"
          required
          invalid={!!errors.due_date}
        />
      </Field>
      <Field label="Status" htmlFor="status" error={errors.status?.[0]}>
        <Select
          id="status"
          name="status"
          defaultValue="pending"
          invalid={!!errors.status}
        >
          {FOLLOW_UP_STATUSES.map((status) => (
            <option key={status} value={status}>
              {formatStatusLabel(status)}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label="Notes"
        htmlFor="notes"
        error={errors.notes?.[0]}
        className="sm:col-span-3"
      >
        <Input id="notes" name="notes" invalid={!!errors.notes} />
      </Field>

      {state.status === "error" && state.message && (
        <div className="sm:col-span-4">
          <Alert variant="error">{state.message}</Alert>
        </div>
      )}

      <div className="flex items-end sm:col-span-4 lg:col-span-1">
        <SubmitButton className="w-full" pendingText="Adding…">
          Add follow-up
        </SubmitButton>
      </div>
    </form>
  );
}
