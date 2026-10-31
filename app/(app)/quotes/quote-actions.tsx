"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select } from "@/components/ui/field";
import { QUOTE_STATUSES, QUOTE_STATUS_LABELS } from "@/lib/quotes";
import type { QuoteStatus } from "@/types/database";
import { deleteQuote, duplicateQuote, updateQuoteStatus } from "./actions";

export function QuoteActions({
  quoteId,
  status,
  quoteLabel,
}: {
  quoteId: string;
  status: QuoteStatus;
  quoteLabel: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          aria-label="Quote status"
          value={status}
          disabled={isPending}
          invalid={!!error}
          onChange={(event) => {
            const next = event.target.value as QuoteStatus;
            setError(null);
            startTransition(async () => {
              const result = await updateQuoteStatus(quoteId, next);
              if (result?.error) setError(result.error);
            });
          }}
          className="w-auto"
        >
          {QUOTE_STATUSES.map((value) => (
            <option key={value} value={value}>
              {QUOTE_STATUS_LABELS[value]}
            </option>
          ))}
        </Select>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isPending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await duplicateQuote(quoteId);
              if (result?.error) setError(result.error);
            });
          }}
        >
          Duplicate
        </Button>

        <ConfirmDialog
          trigger={(open) => (
            <Button type="button" variant="secondary" size="sm" onClick={open}>
              Delete
            </Button>
          )}
          title="Delete quote?"
          description={`This permanently deletes ${quoteLabel} and all of its lines. This can't be undone.`}
          onConfirm={() => deleteQuote(quoteId)}
        />
      </div>
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
