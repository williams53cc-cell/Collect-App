"use client";

import { useRef } from "react";
import { Dialog, type DialogHandle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";

interface CallScriptDialogProps {
  customerName: string;
  customerJob: string | null;
  amountOwed: number;
  dueDate: string;
  promisedDate: string | null;
}

/** Shown instead of the "Message" button once a follow-up's status is
 * "Needs a call" — at that point another automated-feeling text isn't the
 * right move, so this gives the contractor a quick summary plus a
 * suggested opening line rather than a blank page to start the call from. */
export function CallScriptDialog({
  customerName,
  customerJob,
  amountOwed,
  dueDate,
  promisedDate,
}: CallScriptDialogProps) {
  const dialogRef = useRef<DialogHandle>(null);

  const jobClause = customerJob ? ` for the ${customerJob}` : "";
  const opening = `Hi ${customerName}, I'm calling to check whether there's an issue with the remaining balance${jobClause}. I wanted to make sure you have everything you need from us.`;

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.open()}
        className="text-xs font-medium text-gray-600 hover:text-gray-900 hover:underline"
      >
        Call script
      </button>
      <Dialog
        ref={dialogRef}
        title="Call script"
        description={`For ${customerName}`}
      >
        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-gray-500">Job</dt>
            <dd className="text-gray-900">{customerJob ?? "—"}</dd>
            <dt className="text-gray-500">Amount owed</dt>
            <dd className="text-gray-900">{formatCurrency(amountOwed)}</dd>
            <dt className="text-gray-500">Original due date</dt>
            <dd className="text-gray-900">{formatDate(dueDate)}</dd>
            <dt className="text-gray-500">Promised date</dt>
            <dd className="text-gray-900">
              {promisedDate ? formatDate(promisedDate) : "—"}
            </dd>
          </dl>

          <div>
            <p className="text-xs font-medium text-gray-500">
              Suggested opening
            </p>
            <p className="mt-1 rounded-md bg-gray-50 p-3 text-sm text-gray-800">
              {opening}
            </p>
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
