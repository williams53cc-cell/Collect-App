import { describe, expect, it } from "vitest";
import { hasTerm, TERM_OPTIONS, toggleTerm } from "./quote-terms";

describe("toggleTerm", () => {
  it("adds a line to empty text", () => {
    expect(toggleTerm("", TERM_OPTIONS[0])).toBe(TERM_OPTIONS[0]);
  });

  it("adds a line under the existing ones", () => {
    expect(toggleTerm("Work starts Monday.", TERM_OPTIONS[1])).toBe(
      `Work starts Monday.\n${TERM_OPTIONS[1]}`
    );
  });

  it("removes a line that is already there and keeps the others", () => {
    const text = `${TERM_OPTIONS[0]}\nWork starts Monday.\n${TERM_OPTIONS[1]}`;
    expect(toggleTerm(text, TERM_OPTIONS[0])).toBe(
      `Work starts Monday.\n${TERM_OPTIONS[1]}`
    );
  });

  it("ignores blank lines and extra spaces", () => {
    expect(toggleTerm(`  ${TERM_OPTIONS[0]}  \n\n`, TERM_OPTIONS[1])).toBe(
      `${TERM_OPTIONS[0]}\n${TERM_OPTIONS[1]}`
    );
  });

  it("tapping twice gives back the original text", () => {
    const once = toggleTerm("Work starts Monday.", TERM_OPTIONS[2]);
    expect(toggleTerm(once, TERM_OPTIONS[2])).toBe("Work starts Monday.");
  });
});

describe("hasTerm", () => {
  it("finds a whole line only", () => {
    expect(hasTerm(TERM_OPTIONS[0], TERM_OPTIONS[0])).toBe(true);
    expect(hasTerm("Note: " + TERM_OPTIONS[0], TERM_OPTIONS[0])).toBe(false);
    expect(hasTerm("", TERM_OPTIONS[0])).toBe(false);
  });

  it("handles Windows line breaks", () => {
    expect(
      hasTerm(`a\r\n${TERM_OPTIONS[1]}\r\nb`, TERM_OPTIONS[1])
    ).toBe(true);
  });
});
