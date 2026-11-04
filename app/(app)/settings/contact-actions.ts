import { z } from "zod";

/** Shown at the top and bottom of the quote and invoice PDFs. Every box is
 * optional: a contractor who leaves one empty just gets a document without
 * that line. */

export const BUSINESS_PHONE_MAX = 50;
export const BUSINESS_EMAIL_MAX = 200;
export const BUSINESS_ADDRESS_MAX = 300;
export const QUOTE_TERMS_MAX = 1000;
export const TAX_NUMBER_MAX = 30;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TAX_NUMBER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 -]*$/;

const taxNumber = (name: string) =>
  z
    .string()
    .trim()
    .max(TAX_NUMBER_MAX, `${name} must be 30 characters or fewer.`)
    .refine((value) => value === "" || TAX_NUMBER_PATTERN.test(value), {
      message: `${name} can only have letters, numbers, spaces and dashes.`,
    });

export const businessContactSchema = z.object({
  business_phone: z
    .string()
    .trim()
    .max(BUSINESS_PHONE_MAX, "Phone must be 50 characters or fewer."),
  business_email: z
    .string()
    .trim()
    .max(BUSINESS_EMAIL_MAX, "Email must be 200 characters or fewer.")
    .refine((value) => value === "" || EMAIL_PATTERN.test(value), {
      message: "Enter a valid email, like name@example.com.",
    }),
  business_address: z
    .string()
    .trim()
    .max(BUSINESS_ADDRESS_MAX, "Address must be 300 characters or fewer."),
  quote_terms: z
    .string()
    .trim()
    .max(QUOTE_TERMS_MAX, "Terms must be 1000 characters or fewer."),
  trn: taxNumber("TRN"),
  gct_number: taxNumber("GCT number"),
});

export type BusinessContactInput = z.infer<typeof businessContactSchema>;

export function parseBusinessContactForm(formData: FormData) {
  return businessContactSchema.safeParse({
    business_phone: formData.get("business_phone") || "",
    business_email: formData.get("business_email") || "",
    business_address: formData.get("business_address") || "",
    quote_terms: formData.get("quote_terms") || "",
    trn: formData.get("trn") || "",
    gct_number: formData.get("gct_number") || "",
  });
}
