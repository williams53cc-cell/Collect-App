"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, type DialogHandle } from "@/components/ui/dialog";
import { Button, buttonClassName } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { formatCurrency, formatDate, signedDaysFromToday, todayISODate } from "@/lib/format";
import {
  MESSAGE_TONES,
  MESSAGE_TONE_META,
  selectTone,
  renderMessage,
  type MessageTone,
} from "@/lib/message-templates";
import { buildMailtoLink, buildSmsLink, isIOSDevice } from "@/lib/contact-links";

// Follow-ups always have a due date (enforced by the `due_date` NOT NULL
// constraint and required form/schema validation), so this only ever
// distinguishes "due soon" from "due today" from "overdue" — never a
// missing date. `signedDays` is NOT clamped: negative means still upcoming.
function describeDueStatus(signedDays: number): string {
  if (signedDays < 0) {
    const daysUntil = -signedDays;
    return `due in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`;
  }
  if (signedDays === 0) return "due today";
  return `${signedDays} day${signedDays === 1 ? "" : "s"} overdue`;
}

interface DraftMessageDialogProps {
  customerName: string;
  customerJob: string | null;
  amountOwed: number;
  email: string | null;
  phone: string | null;
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
  email,
  phone,
  dueDate,
  promisedDate,
}: DraftMessageDialogProps) {
  const dialogRef = useRef<DialogHandle>(null);
  const [tone, setTone] = useState<MessageTone>("friendly");
  const [message, setMessage] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle"
  );
  const [isIOS, setIsIOS] = useState(false);
  useEffect(() => setIsIOS(isIOSDevice()), []);

  const effectiveDate = promisedDate ?? dueDate;
  const overdueDays = signedDaysFromToday(effectiveDate);
  const promisedDateLabel = promisedDate ? formatDate(promisedDate) : null;
  const promiseBroken = promisedDate ? promisedDate < todayISODate() : false;
  const messageContext = {
    name: customerName,
    job: customerJob?.trim() || null,
    amount: formatCurrency(amountOwed),
    daysOverdue: overdueDays,
    hasDueDate: true,
    dueDateLabel: formatDate(dueDate),
    promisedDateLabel,
    promiseBroken,
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
            ? promiseBroken
              ? `For ${customerName} — broke promise (${promisedDateLabel})`
              : `For ${customerName} — promised ${promisedDateLabel}`
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
                    ? "border-blue-600 bg-blue-600 text-white"
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
              No phone or email on file for this customer — Text and Email
              will open with no recipient pre-filled.
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <a href={buildSmsLink(phone, message, isIOS)} className={buttonClassName({ variant: "secondary", className: "flex-1" })}>
              Text
            </a>
            <a href={buildMailtoLink(email, subject, message)} className={buttonClassName({ variant: "secondary", className: "flex-1" })}>
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
