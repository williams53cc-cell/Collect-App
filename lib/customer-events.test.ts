import { describe, expect, it } from "vitest";
import {
  amountOwedChangedEvent,
  customerAddedEvent,
  followUpCreatedEvent,
  followUpStatusChangedEvent,
  promisedDateClearedEvent,
  promisedDateSetEvent,
} from "./customer-events";

describe("customerAddedEvent", () => {
  it("includes the payment type, amount, and job", () => {
    const event = customerAddedEvent(
      850,
      "Bathroom Renovation",
      "final_balance",
      null,
      null
    );
    expect(event.headline).toBe("Payment created");
    expect(event.detail).toBe(
      "Final balance of $850.00 added for Bathroom Renovation."
    );
  });

  it("drops the job clause entirely when there's no job on file", () => {
    const event = customerAddedEvent(850, null, "final_balance", null, null);
    expect(event.detail).toBe("Final balance of $850.00 added.");
  });

  it("appends a 'Required ...' sentence for a fixed-list trigger", () => {
    const event = customerAddedEvent(
      1500,
      "Bathroom Renovation",
      "deposit",
      "before_work_begins",
      null
    );
    expect(event.detail).toBe(
      "Deposit of $1,500.00 added for Bathroom Renovation. Required before work begins."
    );
  });

  it("appends a 'Trigger: ...' sentence using the custom note", () => {
    const event = customerAddedEvent(
      1000,
      "Bathroom Renovation",
      "stage_payment",
      "custom",
      "After tile installation is complete"
    );
    expect(event.detail).toBe(
      "Stage payment of $1,000.00 added for Bathroom Renovation. Trigger: After tile installation is complete."
    );
  });

  it("adds no trigger sentence at all when there's no trigger set", () => {
    const event = customerAddedEvent(250, null, "other", null, null);
    expect(event.detail).toBe("Other of $250.00 added.");
  });
});

describe("amountOwedChangedEvent", () => {
  it("states the change from the previous amount to the new one", () => {
    const event = amountOwedChangedEvent(850, 550);
    expect(event.headline).toBe("Amount owed updated");
    expect(event.detail).toBe(
      "Amount owed changed from $850.00 to $550.00."
    );
  });
});

describe("followUpCreatedEvent", () => {
  it("quotes the reason and the due date", () => {
    const event = followUpCreatedEvent("Send invoice reminder", "2026-09-10");
    expect(event.headline).toBe("Follow-up added");
    expect(event.detail).toBe(
      '"Send invoice reminder" added, due Sep 10, 2026.'
    );
  });
});

describe("followUpStatusChangedEvent", () => {
  it("uses the human-readable status labels, not the raw enum values", () => {
    const event = followUpStatusChangedEvent("pending", "needs_call");
    expect(event.headline).toBe("Follow-up status changed");
    expect(event.detail).toBe(
      "Status changed from Pending to Needs a call."
    );
  });
});

describe("promisedDateSetEvent", () => {
  it("names the promised date", () => {
    const event = promisedDateSetEvent("2026-09-26");
    expect(event.headline).toBe("Promised to pay");
    expect(event.detail).toBe("Customer promised to pay by Sep 26, 2026.");
  });
});

describe("promisedDateClearedEvent", () => {
  it("has fixed, self-contained wording (no arguments needed)", () => {
    const event = promisedDateClearedEvent();
    expect(event.headline).toBe("Promise cleared");
    expect(event.detail).toBe(
      "The logged promise-to-pay date was cleared."
    );
  });
});
