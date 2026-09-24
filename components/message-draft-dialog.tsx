"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, type DialogHandle } from "@/components/ui/dialog";
import { Button, buttonClassName } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { formatCurrency, formatDate, daysOverdue } from "@/lib/format";
import {
  MESSAGE_TONES,
  MESSAGE_TONE_META,
  selectTone,
  renderMessage,
  type MessageTone,
} from "@/lib/message-templates";
import {
  buildMailtoLink,
  buildSmsLink,
  extractEmail,
  extractPhone,
  isIOSDevice,
} from "@/lib/contact-links";

// Follow-ups always have a due date (enforced by the `due_date` NOT NULL
// constraint and required form/schema validation), so this only ever
// distinguishes "overdue" from "due today" — never a missing date.
function describeDueStatus(overdueDays: number): string {
  if (overdueDays <= 0) return "due today";
  return `${overdueDays} day${overdueDays === 1 ? "" : "s"} overdue`;
}

interface DraftMessageDialogProps {
  customerName: string;
  customerJob: string | null;
  amountOwed: number;
  contact: string | null;
  dueDate: string;
  /** The date the customer verbally promised to pay, if one has been
   * logged. Once set, it's a stronger signal than our own due_date, so it
   * drives both the day-count/tone and the message wording instead. */
  promisedDate: string | null;
}

export function DraftMessageDialog({
  customerName,
  customerJob,
  amountOwed,
  contact,
  dueDate,
  promisedDate,
}: DraftMessageDialogProps) {
  const dialogRef = useRef<DialogHandle>(null);
  const [tone, setTone] = useState<MessageTone>("friendly");
  const [message, setMessage] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle"
  );
  // Set once on mount; only matters at click time (dialog starts closed), so
  // there's no SSR/hydration mismatch to worry about.
  const [isIOS, setIsIOS] = useState(false);
  useEffect(() => setIsIOS(isIOSDevice()), []);

  // Once a customer has promised a date, that promise is the stronger
  // signal — both the tone and the day-count switch to counting from it
  // instead of our own due_date.
  const effectiveDate = promisedDate ?? dueDate;
  const overdueDays = daysOverdue(effectiveDate);
  const promisedDateLabel = promisedDate ? formatDate(promisedDate) : null;
  const messageContext = {
    name: customerName,
    job: customerJob?.trim() || null,
    amount: formatCurrency(amountOwed),
    daysOverdue: overdueDays,
    hasDueDate: true,
    promisedDateLabel,
  };

  function applyTone(nextTone: MessageTone) {
    setTone(nextTone);
    setMessage(renderMessage(nextTone, messageContext));
  }

  function handleOpen() {
    const defaultTone = selectTone(overdueDays);
    setTone(defaultTone);
    setMessage(renderMessage(defaultTone, messageContext));
    setCopyState("idle");
    dialogRef.current?.open();
  }

  const phone = extractPhone(contact);
  const email = extractEmail(contact);
  const subject = customerJob
    ? `Following up on ${customerJob}`
    : "Following up on your balance";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("error");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="text-xs font-medium text-gray-600 hover:text-gray-900 hover:underline"
      >
        Message
      </button>
      <Dialog
        ref={dialogRef}
        title="Draft a message"
        description={
          promisedDateLabel
            ? `For ${customerName} — promised ${promisedDateLabel}`
            : `For ${customerName} — ${describeDueStatus(overdueDays)}`
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {MESSAGE_TONES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => applyTone(t)}
                className={`rounded-md border px-2 py-2 text-left text-xs transition-colors ${
                  tone === t
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className="block font-medium">
                  {MESSAGE_TONE_META[t].label}
                </span>
                <span
                  className={tone === t ? "text-gray-300" : "text-gray-400"}
                >
                  {MESSAGE_TONE_META[t].description}
                </span>
              </button>
            ))}
          </div>

          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={7}
            className="text-sm"
          />

          {!phone && !email && (
            <p className="text-xs text-gray-400">
              No phone or email detected in the contact field — Text and
              Email will open with no recipient pre-filled.
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            
              href={buildSmsLink(phone, message, isIOS)}
              className={buttonClassName({
                variant: "secondary",
                className: "flex-1",
              })}
            >
              Text
            </a>
            
              href={buildMailtoLink(email, subject, message)}
              className={buttonClassName({
                variant: "secondary",
                className: "flex-1",
              })}
            >
              Email
            </a>
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={handleCopy}
            >
              {copyState === "copied"
                ? "Copied!"
                : copyState === "error"
                  ? "Couldn't copy"
                  : "Copy"}
            </Button>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => dialogRef.current?.close()}
            >
              Close
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
