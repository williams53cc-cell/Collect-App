"use client";

import { useRef, useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, type DialogHandle } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/field";
import { todayISODate } from "@/lib/format";
import { addDaysISO } from "@/lib/invoices";
import type { InvoiceStatus } from "@/types/database";
import {
  deleteInvoiceAction,
  issueInvoiceAction,
  voidInvoiceAction,
} from "./actions";

export function InvoiceActions({
  invoiceId,
  status,
  invoiceLabel,
}: {
  invoiceId: string;
  status: InvoiceStatus;
  invoiceLabel: string;
}) {
  if (status === "draft") {
    return <DraftActions invoiceId={invoiceId} invoiceLabel={invoiceLabel} />;
  }
  if (status === "issued") {
    return <IssuedActions invoiceId={invoiceId} invoiceLabel={invoiceLabel} />;
  }
  return null;
}

function DraftActions({
  invoiceId,
  invoiceLabel,
}: {
  invoiceId: string;
  invoiceLabel: string;
}) {
  const dialogRef = useRef<DialogHandle>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dueOn, setDueOn] = useState(() => addDaysISO(todayISODate(), 14));

  function issue() {
    setError(null);
    startTransition(async () => {
      const result = await issueInvoiceAction(invoiceId, dueOn);
      if (result?.error) {
        setError(result.error);
        return;
      }
      dialogRef.current?.close();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        onClick={() => {
          setError(null);
          dialogRef.current?.open();
        }}
      >
        Issue invoice
      </Button>

      <ConfirmDialog
        trigger={(open) => (
          <Button type="button" variant="secondary" size="sm" onClick={open}>
            Delete draft
          </Button>
        )}
        title="Delete draft invoice?"
        description={`This permanently deletes this ${invoiceLabel.toLowerCase()} invoice and its lines. The quote it came from is not changed.`}
        onConfirm={() => deleteInvoiceAction(invoiceId)}
      />

      <Dialog
        ref={dialogRef}
        title="Issue this invoice?"
        description="It gets the next invoice number and is locked, so it can no longer be edited. If something is wrong later you cancel it and make a new one."
      >
        <div className="space-y-3">
          {error && <Alert variant="error">{error}</Alert>}
          <div>
            <label
              htmlFor="invoice_due_on"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Payment due date
            </label>
            <Input
              id="invoice_due_on"
              type="date"
              value={dueOn}
              onChange={(event) => setDueOn(event.target.value)}
            />
            <p className="mt-1 text-xs text-gray-400">
              Optional. Clear it if there is no fixed due date.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={() => dialogRef.current?.close()}
            >
              Cancel
            </Button>
            <Button type="button" disabled={isPending} onClick={issue}>
              {isPending ? "Issuing..." : "Issue invoice"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function IssuedActions({
  invoiceId,
  invoiceLabel,
}: {
  invoiceId: string;
  invoiceLabel: string;
}) {
  const dialogRef = useRef<DialogHandle>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  function cancelInvoice() {
    setError(null);
    startTransition(async () => {
      const result = await voidInvoiceAction(invoiceId, reason);
      if (result?.error) {
        setError(result.error);
        return;
      }
      dialogRef.current?.close();
    });
  }

  return (
    <div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => {
          setError(null);
          dialogRef.current?.open();
        }}
      >
        Cancel invoice
      </Button>

      <Dialog
        ref={dialogRef}
        title={`Cancel ${invoiceLabel}?`}
        description="The invoice is marked Void and keeps its number. You can't undo this. To correct a mistake, cancel it and make a new invoice from the quote."
      >
        <div className="space-y-3">
          {error && <Alert variant="error">{error}</Alert>}
          <div>
            <label
              htmlFor="invoice_void_reason"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Reason (optional)
            </label>
            <Textarea
              id="invoice_void_reason"
              rows={2}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Wrong quantity, wrong customer..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={() => dialogRef.current?.close()}
            >
              Keep invoice
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={isPending}
              onClick={cancelInvoice}
            >
              {isPending ? "Cancelling..." : "Cancel invoice"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
