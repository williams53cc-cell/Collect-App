
describe("renderMessage — payment link", () => {
  const base = {
    name: "Jordan Smith",
    job: "Kitchen remodel",
    amount: "$1,200.00",
    daysOverdue: 1,
    hasDueDate: true,
    promisedDateLabel: null,
  };

  it("appends a payment line before the sign-off when a link is provided", () => {
    const withLink = {
      ...base,
      paymentLink: "https://paypal.me/jordansmith/1200.00",
    };
    for (const tone of MESSAGE_TONES) {
      const message = renderMessage(tone, withLink);
      expect(message).toContain(
        "You can pay here: https://paypal.me/jordansmith/1200.00"
      );
      expect(message.indexOf("You can pay here:")).toBeLessThan(
        message.indexOf("Thanks,")
      );
    }
  });

  it("omits the payment line entirely when no link is provided", () => {
    for (const tone of MESSAGE_TONES) {
      expect(renderMessage(tone, base)).not.toMatch(/pay here/);
    }
  });

  it("omits the payment line when the link is explicitly null", () => {
    const withNullLink = { ...base, paymentLink: null };
    for (const tone of MESSAGE_TONES) {
      expect(renderMessage(tone, withNullLink)).not.toMatch(/pay here/);
    }
  });
});
