/** Ready-made lines a contractor can tap to add to the terms printed at
 * the bottom of a quote. They stay editable: the terms box is ordinary
 * text, and these just add or remove one line of it. */
export const TERM_OPTIONS = [
  "50% deposit before work starts.",
  "Balance due on completion.",
  "Prices valid for 30 days.",
  "Material prices may change after the validity period.",
  "Extra work will be quoted separately.",
  "Client to provide water and electricity on site.",
  "Payment by cash or bank transfer.",
] as const;

function lines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

/** True when `term` is already one of the lines in `text`. */
export function hasTerm(text: string, term: string): boolean {
  return lines(text).includes(term);
}

/** Adds `term` as a new line, or removes that line if it is already there.
 * Lines the contractor typed themselves are left exactly as they were. */
export function toggleTerm(text: string, term: string): string {
  const current = lines(text);
  const next = current.includes(term)
    ? current.filter((line) => line !== term)
    : [...current, term];
  return next.join("\n");
}
