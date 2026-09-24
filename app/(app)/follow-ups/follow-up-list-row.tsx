"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Select } from "@/components/ui/field";
import { Badge, FollowUpStatusBadge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DraftMessageDialog } from "@/components/message-draft-dialog";
import { CallScriptDialog } from "@/components/call-script-dialog";
import { PromisedDateControl } from "@/components/promised-date-control";
import { formatDate, isOverdue } from "@/lib/format";
import { FOLLOW_UP_STATUSES, formatStatusLabel } from "@/lib/validation/follow-up";
import type { FollowUpStatus } from "@/types/database";
import type { FollowUpWithCustomer } from "@/lib/data/follow-ups";
import { deleteFollowUp, updateFollowUpStatus } from "./actions";

export function FollowUpListRow({
  followUp,
}: {
  followUp: FollowUpWithCustomer;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const overdue = isOverdue(followUp.due_date, followUp.status);

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3">
        <Link
          href={`/customers/${followUp.customer_id}`}
          className="font-medium text-gray-900 hover:underline"
        >
          {followUp.customerName}
        </Link>
      </td>
      <td className="px-4 py-3">{followUp.reason}</td>
      <td className="px-4 py-3 text-gray-600">
        <span className={overdue ? "font-medium text-red-600" : undefined}>
          {formatDate(followUp.due_date)}
        </span>
        {overdue && (
          <span className="ml-2">
            <Badge tone="red">Overdue</Badge>
          </span>
        )}
        <PromisedDateControl
          followUpId={followUp.id}
          customerId={followUp.customer_id}
          promisedDate={followUp.promised_date}
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Select
            value={followUp.status}
            disabled={isPending}
            className="w-auto py-1 text-xs"
            onChange={(event) => {
              const next = event.target.value as FollowUpStatus;
              setError(null);
              startTransition(async () => {
                const result = await updateFollowUpStatus(
                  followUp.id,
                  followUp.customer_id,
                  next
                );
                if (result?.error) setError(result.error);
              });
            }}
          >
            {FOLLOW_UP_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatStatusLabel(status)}
              </option>
            ))}
          </Select>
          <FollowUpStatusBadge status={followUp.status} />
        </div>
        {error && (
          <p className="mt-1 text-xs text-red-600" role="alert">
            {error}
          </p>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-3">
          {followUp.status === "pending" && (
            <DraftMessageDialog
              customerName={followUp.customerName}
              customerJob={followUp.customerJob}
              amountOwed={followUp.customerAmountOwed}
              contact={followUp.customerContact}
              dueDate={followUp.due_date}
              promisedDate={followUp.promised_date}
            />
          )}
          {followUp.status === "needs_call" && (
            <CallScriptDialog
              customerName={followUp.customerName}
              customerJob={followUp.customerJob}
              amountOwed={followUp.customerAmountOwed}
              dueDate={followUp.due_date}
              promisedDate={followUp.promised_date}
            />
          )}
          <ConfirmDialog
            trigger={(open) => (
              <button
                onClick={open}
                className="text-xs text-red-600 hover:underline"
              >
                Delete
              </button>
            )}
            title="Delete follow-up?"
            description="This permanently removes this follow-up. This can't be undone."
            onConfirm={() => deleteFollowUp(followUp.id, followUp.customer_id)}
          />
        </div>
      </td>
    </tr>
  );
}
