import { z } from "zod";

export const BUSINESS_TYPES = [
  "renovation_contractor",
  "general_contractor",
  "electrician",
  "plumber",
  "hvac_contractor",
  "landscaper",
  "painter",
  "roofer",
  "tile_installer",
  "other",
] as const;

export const BUSINESS_TYPE_LABELS: Record<
  (typeof BUSINESS_TYPES)[number],
  string
> = {
  renovation_contractor: "Renovation Contractor",
  general_contractor: "General Contractor",
  electrician: "Electrician",
  plumber: "Plumber",
  hvac_contractor: "HVAC Contractor",
  landscaper: "Landscaper",
  painter: "Painter",
  roofer: "Roofer",
  tile_installer: "Tile Installer",
  other: "Other",
};

/** A short, curated list rather than the full ISO-4217 table — a
 * contractor picks this once and it rarely changes. Kept as an enum at
 * the form layer; the database column is plain text so a new code can be
 * added here later without a migration. */
export const CURRENCIES = [
  "USD",
  "CAD",
  "GBP",
  "EUR",
  "JMD",
  "AUD",
  "NZD",
] as const;

export const CURRENCY_LABELS: Record<(typeof CURRENCIES)[number], string> = {
  USD: "USD — US Dollar",
  CAD: "CAD — Canadian Dollar",
  GBP: "GBP — British Pound",
  EUR: "EUR — Euro",
  JMD: "JMD — Jamaican Dollar",
  AUD: "AUD — Australian Dollar",
  NZD: "NZD — New Zealand Dollar",
};

export const PAYMENT_METHODS = [
  "paypal",
  "venmo",
  "zelle",
  "check",
  "other",
] as const;

export const PAYMENT_METHOD_LABELS: Record<
  (typeof PAYMENT_METHODS)[number],
  string
> = {
  paypal: "PayPal",
  venmo: "Venmo",
  zelle: "Zelle",
  check: "Check",
  other: "Other",
};

export const businessInfoSchema = z.object({
  business_name: z
    .string()
    .trim()
    .min(1, "Business name is required.")
    .max(200, "Business name must be 200 characters or fewer."),
  business_type: z.enum(BUSINESS_TYPES, {
    errorMap: () => ({ message: "Choose a business type." }),
  }),
  currency: z.enum(CURRENCIES, {
    errorMap: () => ({ message: "Choose a currency." }),
  }),
  country: z
    .string()
    .trim()
    .max(200, "Country must be 200 characters or fewer.")
    .optional()
    .or(z.literal("")),
  timezone: z
    .string()
    .trim()
    .max(100, "Time zone must be 100 characters or fewer.")
    .optional()
    .or(z.literal("")),
});

export type BusinessInfoInput = z.infer<typeof businessInfoSchema>;

export function parseBusinessInfoForm(formData: FormData) {
  return businessInfoSchema.safeParse({
    business_name: formData.get("business_name"),
    business_type: formData.get("business_type") || "other",
    currency: formData.get("currency") || "USD",
    country: formData.get("country") || "",
    timezone: formData.get("timezone") || "",
  });
}

export const paymentInfoSchema = z.object({
  payment_method: z.enum(PAYMENT_METHODS).optional().or(z.literal("")),
  payment_link: z
    .string()
    .trim()
    .max(500, "Payment link must be 500 characters or fewer.")
    .optional()
    .or(z.literal("")),
  payment_instructions: z
    .string()
    .trim()
    .max(1000, "Payment instructions must be 1000 characters or fewer.")
    .optional()
    .or(z.literal("")),
  // A real boolean, not a FormData string — computed by the caller before
  // this ever reaches safeParse (see parsePaymentInfoForm below). An
  // unchecked checkbox is simply absent from FormData entirely, the same
  // gap that once broke the customer form's payment_trigger_note field
  // (lib/validation/customer.ts) — the fix there was a `|| ""` fallback,
  // but a checkbox has no text value to fall back to, so the fallback has
  // to happen before the object reaches the schema, not inside it.
  include_payment_link_default: z.boolean(),
});

export type PaymentInfoInput = z.infer<typeof paymentInfoSchema>;

export function parsePaymentInfoForm(formData: FormData) {
  return paymentInfoSchema.safeParse({
    payment_method: formData.get("payment_method") || "",
    payment_link: formData.get("payment_link") || "",
    payment_instructions: formData.get("payment_instructions") || "",
    include_payment_link_default:
      formData.get("include_payment_link_default") === "on",
  });
}
