import { z } from "zod";

export const FOLLOW_UP_STATUSES = [
  "pending",
  "needs_call",
  "done",
  "skipped",
] as const;

const STATUS_LABELS: Record<(typeof FOLLOW_UP_STATUSES)[number], string> = {
  pending: "Pending",
  needs_call: "Needs a call",
  done: "Done",
  skipped: "Skipped",
};

export function formatStatusLabel(
  status: (typeof FOLLOW_UP_STATUSES)[number]
): string {
  return STATUS_LABELS[status];
}

export const followUpSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "Reason is required.")
    .max(200, "Reason must be 200 characters or fewer."),
  due_date: z
    .string()
    .trim()
    .min(1, "Due date is required.")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Enter a valid date."),
  status: z.enum(FOLLOW_UP_STATUSES, {
    errorMap: () => ({ message: "Choose a valid status." }),
  }),
  notes: z
    .string()
    .trim()
    .max(2000, "Notes must be 2000 characters or fewer.")
    .optional()
    .or(z.literal("")),
});

export type FollowUpInput = z.infer<typeof followUpSchema>;

export function parseFollowUpForm(formData: FormData) {
  return followUpSchema.safeParse({
    reason: formData.get("reason"),
    due_date: formData.get("due_date"),
    status: formData.get("status"),
    notes: formData.get("notes"),
  });
}
