import { z } from "zod";
import { businessInfoSchema } from "./business-profile";

export const ownerNameSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(1, "First name is required.")
    .max(100, "First name must be 100 characters or fewer."),
  last_name: z
    .string()
    .trim()
    .min(1, "Last name is required.")
    .max(100, "Last name must be 100 characters or fewer."),
});

export type OwnerNameInput = z.infer<typeof ownerNameSchema>;

export function parseOwnerNameForm(formData: FormData) {
  return ownerNameSchema.safeParse({
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
  });
}

// Reuses businessInfoSchema's own field definitions (validation rules,
// error messages) rather than redefining them — the onboarding wizard
// just splits the same five fields Settings saves as one section into
// two screens.
export const businessBasicsSchema = businessInfoSchema.pick({
  business_name: true,
  business_type: true,
});

export type BusinessBasicsInput = z.infer<typeof businessBasicsSchema>;

export function parseBusinessBasicsForm(formData: FormData) {
  return businessBasicsSchema.safeParse({
    business_name: formData.get("business_name"),
    business_type: formData.get("business_type") || "other",
  });
}

export const businessDetailsSchema = businessInfoSchema.pick({
  currency: true,
  country: true,
  timezone: true,
});

export type BusinessDetailsInput = z.infer<typeof businessDetailsSchema>;

export function parseBusinessDetailsForm(formData: FormData) {
  return businessDetailsSchema.safeParse({
    currency: formData.get("currency") || "USD",
    country: formData.get("country") || "",
    timezone: formData.get("timezone") || "",
  });
}

// Step 4 (Getting paid) reuses paymentInfoSchema / parsePaymentInfoForm
// directly from business-profile.ts — it's exactly the same fields as
// the Settings "Getting paid" section, nothing onboarding-specific to
// add.
