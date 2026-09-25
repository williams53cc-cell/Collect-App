"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { Dialog, type DialogHandle } from "@/components/ui/dialog";
import { CUSTOMER_STATUSES } from "@/lib/validation/customer";
import { initialFormState } from "@/lib/form-state";
import { createCustomer } from "./actions";

export function NewCustomerDialog() {
  const dialogRef = useRef<DialogHandle>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(
    createCustomer,
    initialFormState
  );

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      dialogRef.current?.close();
    }
  }, [state]);

  const errors = state.errors ?? {};

  return (
    <>
      <Button onClick={() => dialogRef.current?.open()}>Add customer</Button>
      <Dialog
        ref={dialogRef}
        title="Add customer"
        description="Track who owes you and how to reach them."
      >
        <form ref={formRef} action={formAction} className="space-y-4">
          <Field label="Name" htmlFor="name" required error={errors.name?.[0]}>
            <Input
              id="name"
              name="name"
              required
              invalid={!!errors.name}
              placeholder="Jordan Smith"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Email" htmlFor="email" error={errors.email?.[0]}>
              <Input
                id="email"
                name="email"
                type="email"
                invalid={!!errors.email}
                placeholder="jordan@email.com"
              />
            </Field>
            <Field label="Phone" htmlFor="phone" error={errors.phone?.[0]}>
              <Input
                id="phone"
                name="phone"
                type="tel"
                invalid={!!errors.phone}
                placeholder="(555) 123-4567"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Job" htmlFor="job" error={errors.job?.[0]}>
              <Input
                id="job"
                name="job"
                invalid={!!errors.job}
                placeholder="Kitchen remodel"
              />
            </Field>
            <Field
              label="Amount owed"
              htmlFor="amount_owed"
              error={errors.amount_owed?.[0]}
            >
              <Input
                id="amount_owed"
                name="amount_owed"
                type="number"
                step="0.01"
                min="0"
                defaultValue="0"
