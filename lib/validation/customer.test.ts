import { describe, expect, it } from "vitest";
import { parseCustomerForm } from "./customer";

/**
 * Regression coverage for a real bug: payment_trigger_note only exists in
 * the DOM when "Custom" is selected as the trigger (new-customer-form.tsx /
 * edit-customer-dialog.tsx render it conditionally). Every other submission
 * therefore has NO payment_trigger_note key in the browser's FormData at
 * all, and FormData.get() returns null (not undefined, not "") for a
 * missing key — which broke validation for every single submission
 * regardless of what the contractor filled in.
 */
function baseFormData(overrides: Record<string, string> = {}): FormData {
  const formData = new FormData();
  formData.set("name", "Jordan Smith");
  formData.set("email", "");
  formData.set("phone", "");
  formData.set("job", "");
  formData.set("amount_owed", "0");
  formData.set("status", "active");
  formData.set("payment_type", "other");
  formData.set("payment_trigger", "");
  formData.set("notes", "");
  for (const [key, value] of Object.entries(overrides)) {
    formData.set(key, value);
  }
  return formData;
}

describe("parseCustomerForm", () => {
  it("succeeds when payment_trigger_note is never in the FormData at all (the real-world case for every non-custom trigger)", () => {
    const formData = baseFormData();
    // Never call .set("payment_trigger_note", ...) — this is exactly what
    // the browser sends when the field isn't rendered.
    const result = parseCustomerForm(formData);
    expect(result.success).toBe(true);
  });

  it("succeeds with a fixed-list trigger and no note field present", () => {
    const formData = baseFormData({
      payment_type: "deposit",
      payment_trigger: "before_work_begins",
    });
    const result = parseCustomerForm(formData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.payment_trigger).toBe("before_work_begins");
      expect(result.data.payment_trigger_note).toBe("");
    }
  });

  it("succeeds with 'custom' trigger and a note actually present", () => {
    const formData = baseFormData({
      payment_type: "stage_payment",
      payment_trigger: "custom",
      payment_trigger_note: "After tile installation is complete",
    });
    const result = parseCustomerForm(formData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.payment_trigger_note).toBe(
        "After tile installation is complete"
      );
    }
  });

  it("still fails when a genuinely required field is missing", () => {
    const formData = baseFormData({ name: "" });
    const result = parseCustomerForm(formData);
    expect(result.success).toBe(false);
  });

  it("defaults payment_type to 'other' when the field is missing", () => {
    const formData = baseFormData();
    formData.delete("payment_type");
    const result = parseCustomerForm(formData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.payment_type).toBe("other");
    }
  });
});
