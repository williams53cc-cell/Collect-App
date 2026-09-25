"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { Dialog, type DialogHandle } from "@/components/ui/dialog";
import { CUSTOMER_STATUSES } from "@/lib/validation/customer";
import { initialFormState } from "@/lib/form-state";
import { updateCustomer } from "../actions";
import type { CustomerStatus } from "@/types/database";

interface EditCustomerDialogProps {
  customerId: string;
  name: string;
  email: string | null;
  phone: string | null;
  job: string | null;
  amountOwed: number;
  status: CustomerStatus;
  notes: string | null;
}

/** Was missing entirely before — the customer detail page could only
 * change status (see CustomerStatusSelect); there was no way to fix a
 * typo in someone's contact info or update their job name after they were
 * first added. That gap read as "the app isn't saving my changes," when
 * really there was never a save control for those fields in the first
 * place. */
export function EditCustomerDialog({
  customerId,
  name,
  email,
  phone,
  job,
  amountOwed,
  status,
  notes,
}: EditCustomerDialogProps) {
  const dialogRef = useRef<DialogHandle>(null);
  const boundAction = updateCustomer.bind(null, customerId);
  const [state, formAction] = useActionState(boundAction, initialFormState);

  useEffect(() => {
    if (state.status === "success") {
      dialogRef.current?.close();
    }
  }, [state]);

  const errors = state.errors ?? {};

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => dialogRef.current?.open()}
      >
        Edit
      </Button>
      <Dialog
        ref={dialogRef}
        title="Edit customer"
        description="Update contact info, job, and balance."
      >
        <form action={formAction} className="space-y-4">
          <Field
            label="Name"
            htmlFor="edit_name"
            required
            error={errors.name?.[0]}
          >
            <Input
              id="edit_name"
              name="name"
              required
              defaultValue={name}
              invalid={!!errors.name}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Email" htmlFor="edit_email" error={errors.email?.[0]}>
              <Input
                id="edit_email"
                name="email"
                type="email"
                defaultValue={email ?? ""}
                invalid={!!errors.email}
                placeholder="jordan@email.com"
              />
            </Field>
            <Field label="Phone" htmlFor="edit_phone" error={errors.phone?.[0]}>
              <Input
                id="edit_phone"
                name="phone"
                type="tel"
                defaultValue={phone ?? ""}
                invalid={!!errors.phone}
                placeholder="(555) 123-4567"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Job" htmlFor="edit_job" error={errors.job?.[0]}>
              <Input
                id="edit_job"
                name="job"
                defaultValue={job ?? ""}
                invalid={!!errors.job}
                placeholder="Kitchen remodel"
              />
            </Field>
            <Field
              label="Amount owed"
              htmlFor="edit_amount_owed"
              error={errors.amount_owed?.[0]}
            >
              <Input
                id="edit_amount_owed"
                name="amount_owed"
                type="number"
                step="0.01"
                min="0"
                defaultValue={amountOwed}
                invalid={!!errors.amount_owed}
              />
            </Field>
          </div>

          <Field
            label="Status"
            htmlFor="edit_status"
            error={errors.status?.[0]}
          >
            <Select
              id="edit_status"
              name="status"
              defaultValue={status}
              invalid={!!errors.status}
            >
              {CUSTOMER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s[0].toUpperCase() + s.slice(1)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Notes" htmlFor="edit_notes" error={errors.notes?.[0]}>
            <Textarea
              id="edit_notes"
              name="notes"
              rows={2}
              defaultValue={notes ?? ""}
              invalid={!!errors.notes}
            />
          </Field>

          {state.status === "error" && state.message && (
            <Alert variant="error">{state.message}</Alert>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => dialogRef.current?.close()}
            >
              Cancel
            </Button>
            <SubmitButton>Save changes</SubmitButton>
          </div>
        </form>
      </Dialog>
    </>
  );
}
