/** Reads `navigator`, so only call this from an effect/handler on the client
 * — never during render, or the server-rendered markup (no `navigator`) will
 * mismatch the client's first paint. */
export function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isAppleTouchDevice = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ reports as "MacIntel" but, unlike a real Mac, has touch points.
  const isModerniPad =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return isAppleTouchDevice || isModerniPad;
}

/** iOS wants `sms:<number>&body=`, Android (and everything else) wants
 * `sms:<number>?body=`. Both accept an empty number, which just opens the
 * compose screen with no recipient pre-filled. */
export function buildSmsLink(
  phone: string | null,
  body: string,
  isIOS: boolean
): string {
  const separator = isIOS ? "&" : "?";
  return `sms:${phone ?? ""}${separator}body=${encodeURIComponent(body)}`;
}

export function buildMailtoLink(
  email: string | null,
  subject: string,
  body: string
): string {
  return `mailto:${email ?? ""}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
}

/** WhatsApp's "click to chat" link (wa.me) needs the full number with
 * country code and nothing else — no "+", spaces, dashes, or parens — or
 * it won't find the contact. Customers' phone numbers are typed free-form
 * (see lib/validation/customer.ts), so this strips everything but digits
 * first. A number already typed with its country code (e.g. "+44 7911
 * 123456" or "1 555 123 4567") comes through correctly once the
 * punctuation is gone. A bare 10-digit number, though, is how most
 * contractors will actually type a customer's number (e.g.
 * "555-123-4567") — GripBill's contractors are U.S.-based today, so
 * that's assumed to be a U.S. number missing its "1" country code, and
 * it's added; any other digit count is passed through as-is rather than
 * guessed at. When there's no phone on file, wa.me still accepts a bare
 * `?text=` with no number: WhatsApp opens with the message ready and lets
 * the sender pick who to send it to. */
export function buildWhatsAppLink(phone: string | null, body: string): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  const number = digits.length === 10 ? `1${digits}` : digits;
  return `https://wa.me/${number}?text=${encodeURIComponent(body)}`;
}
