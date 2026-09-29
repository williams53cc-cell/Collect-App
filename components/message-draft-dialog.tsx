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
import { buildPaypalLink } from "@/lib/paypal";
import { buildPaymentContextLine } from "@/lib/payment-context";
import type { PaymentTrigger, PaymentType } from "@/types/database";

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
  /** The contractor's own PayPal.me username, saved in Settings — null
   * when they haven't set one up yet. When present, every drafted message
   * includes a payment link pre-filled with this customer's balance. */
  paypalUsername: string | null;
  /** This customer's payment type/trigger fields (set on the Add/Edit
   * Customer form). Combined via buildPaymentContextLine() into a single
   * line — e.g. "Deposit — required before work begins." — that's
   * appended to every drafted message when there's something worth
   * saying. */
  paymentType: PaymentType | null;
  paymentTrigger: PaymentTrigger | null;
  paymentTriggerNote: string | null;
}

export function DraftMessageDialog({
  customerName,
  customerJob,
  amountOwed,
  email,
  phone,
  dueDate,
  promisedDate,
  paypalUsername,
  paymentType,
  paymentTrigger,
  paymentTriggerNote,
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
  const paymentLink = paypalUsername
    ? buildPaypalLink(paypalUsername, amountOwed)
    : null;
  const paymentContext = buildPaymentContextLine(
    paymentType,
    paymentTrigger,
    paymentTriggerNote
  );
  const messageContext = {
    name: customerName,
    job: customerJob?.trim() || null,
    amount: formatCurrency(amountOwed),
    daysOverdue: overdueDays,
    hasDueDate: true,
    dueDateLabel: formatDate(dueDate),
    promisedDateLabel,
    promiseBroken,
    paymentLink,
    paymentContext,
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
