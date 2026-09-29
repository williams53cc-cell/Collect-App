import { z } from "zod";

export const CUSTOMER_STATUSES = [
  "active",
  "overdue",
  "paid",
  "closed",
] as const;

/** What kind of payment a balance is. Kept as a small fixed set with an
 * "other" catch-all — see PAYMENT_TRIGGERS below for the companion field
 * that says *when* it's due. Required going forward (every new/edited
 * customer picks one), but nullable at the database level so customers
 * added before this field existed keep working unchanged. */
export const PAYMENT_TYPES = [
  "deposit",
  "materials_payment",
  "stage_payment",
  "final_balance",
  "other",
] as const;

export const PAYMENT_TYPE_LABELS: Record<(typeof PAYMENT_TYPES)[number], string> = {
  deposit: "Deposit",
  materials_payment: "Materials payment",
  stage_payment: "Stage payment",
  final_balance: "Final balance",
  other: "Other",
};

/** What has to happen before a payment is due — optional context on top of
 * Payment Type. "on_specific_date" is deliberately not given any extra
 * wording elsewhere in the app (see lib/payment-context.ts): the due date
 * already says that on its own. "custom" pairs with a free-text note
 * (payment_trigger_note) for anything that doesn't fit the fixed list. */
export const PAYMENT_TRIGGERS = [
  "before_work_begins",
  "before_materials_ordered",
  "after_stage_completed",
  "at_job_completion",
  "on_specific_date",
  "custom",
] as const;

export const PAYMENT_TRIGGER_LABELS: Record<(typeof PAYMENT_TRIGGERS)[number], string> = {
  before_work_begins: "Before work begins",
  before_materials_ordered: "Before materials are ordered",
  after_stage_completed: "After a work stage is completed",
  at_job_completion: "At job completion",
  on_specific_date: "On a specific date",
  custom: "Custom",
};

export const customerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(200, "Name must be 200 characters or fewer."),
  email: z
    .string()
    .trim()
    .max(200, "Email must be 200 characters or fewer.")
    .refine(
      (value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      "Enter a valid email address."
    )
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .max(50, "Phone must be 50 characters or fewer.")
    .optional()
    .or(z.literal("")),
  job: z
    .string()
    .trim()
    .max(200, "Job must be 200 characters or fewer.")
    .optional()
    .or(z.literal("")),
  amount_owed: z.coerce
    .number({ invalid_type_error: "Enter a valid amount." })
    .min(0, "Amount owed can't be negative.")
    .max(100_000_000, "That amount looks too large."),
  status: z.enum(CUSTOMER_STATUSES, {
    errorMap: () => ({ message: "Choose a valid status." }),
  }),
  payment_type: z.enum(PAYMENT_TYPES, {
    errorMap: () => ({ message: "Choose a payment type." }),
  }),
  payment_trigger: z.enum(PAYMENT_TRIGGERS).optional().or(z.literal("")),
  payment_trigger_note: z
    .string()
    .trim()
    .max(300, "Trigger details must be 300 characters or fewer.")
    .optional()
    .or(z.literal("")),
  notes: z
    .string()
    .trim()
    .max(2000, "Notes must be 2000 characters or fewer.")
    .optional()
    .or(z.literal("")),
});

export type CustomerInput = z.infer<typeof customerSchema>;

export function parseCustomerForm(formData: FormData) {
  return customerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    job: formData.get("job"),
    amount_owed: formData.get("amount_owed") || 0,
    status: formData.get("status"),
    payment_type: formData.get("payment_type") || "other",
    // payment_trigger_note only exists in the DOM when the contractor has
    // picked "Custom" as the trigger (see the conditional <Field> in
    // new-customer-form.tsx / edit-customer-dialog.tsx). Whenever it's
    // hidden, formData.get() returns null rather than an empty string —
    // and null isn't a value the schema's `.optional()` accepts (that only
    // covers a missing/undefined key), so every submission with a trigger
    // other than "custom" failed validation. Same defensive fallback on
    // payment_trigger in case that field is ever made conditional too.
    payment_trigger: formData.get("payment_trigger") || "",
    payment_trigger_note: formData.get("payment_trigger_note") || "",
    notes: formData.get("notes"),
  });
}
