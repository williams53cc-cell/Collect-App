import { describe, expect, it } from "vitest";
import { buildPaymentContextLine, describePaymentTrigger } from "./payment-context";

describe("describePaymentTrigger", () => {
  it("returns the lowercase label for a fixed-list trigger", () => {
    expect(describePaymentTrigger("before_work_begins", null)).toBe(
      "before work begins"
    );
    expect(describePaymentTrigger("before_materials_ordered", null)).toBe(
      "before materials are ordered"
    );
  });

  it("returns null when there's no trigger set", () => {
    expect(describePaymentTrigger(null, null)).toBeNull();
  });

  it("returns null for 'on a specific date' — the due date already says that", () => {
    expect(describePaymentTrigger("on_specific_date", null)).toBeNull();
  });

  it("returns the trimmed custom note when the trigger is 'custom'", () => {
    expect(
      describePaymentTrigger("custom", "  After tile installation is complete.  ")
    ).toBe("After tile installation is complete.");
  });

  it("returns null for 'custom' when no note was actually typed in", () => {
    expect(describePaymentTrigger("custom", null)).toBeNull();
    expect(describePaymentTrigger("custom", "   ")).toBeNull();
  });
});

describe("buildPaymentContextLine", () => {
  it("returns null when there's no payment type at all", () => {
    expect(buildPaymentContextLine(null, null, null)).toBeNull();
  });

  it("skips entirely for 'other' with no trigger", () => {
    expect(buildPaymentContextLine("other", null, null)).toBeNull();
  });

  it("still shows 'other' when it does have a trigger", () => {
    expect(buildPaymentContextLine("other", "at_job_completion", null)).toBe(
      "Other — required at job completion."
    );
  });

  it("shows just the type label when there's no trigger", () => {
    expect(buildPaymentContextLine("deposit", null, null)).toBe("Deposit.");
  });

  it("combines the type label and trigger clause", () => {
    expect(
      buildPaymentContextLine("materials_payment", "before_materials_ordered", null)
    ).toBe("Materials payment — required before materials are ordered.");
  });

  it("uses the custom note as the trigger clause", () => {
    expect(
      buildPaymentContextLine(
        "stage_payment",
        "custom",
        "After tile installation is complete"
      )
    ).toBe(
      "Stage payment — required After tile installation is complete."
    );
  });
});
