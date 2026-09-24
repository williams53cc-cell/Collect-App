"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { setPromisedDate } from "@/app/(app)/follow-ups/actions";

/** Lets the contractor log the date a customer verbally promised to pay,
 * separate from the follow-up's own due_date (when *we* plan to check in).
 * Shared between the Follow-ups list and the customer detail page so both
 * stay in sync instead of drifting apart. */
export function PromisedDateControl({
  followUpId,
  customerId,
  promisedDate,
}: {
  followUpId: string;
  customerId: string;
  promisedDate: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [showInput, setShowInput] = useState(false);
  const [value, setValue] = useState(promisedDate ?? "");
  const [error, setError] = useState<string | null>(null);

  function save(next: string | null) {
    setError(null);
    startTransition(async () => {
      const result = await setPromisedDate(followUpId, customerId, next);
      if (result?.error) {
        setError(result.error);
      } else {
        setShowInput(false);
      }
    });
  }

  return (
    <div className="mt-1">
      {promisedDate ? (
        <div className="flex items-center gap-1">
          <Badge tone="purple">Promised {formatDate(promisedDate)}</Badge>
          <button
            type="button"
            disabled={isPending}
            onClick={() => save(null)}
            className="text-xs text-gray-400 hover:text-gray-600"
            aria-label="Clear promised date"
          >
            ×
          </button>
        </div>
      ) : showInput ? (
        <form
          className="flex items-center gap-1"
          onSubmit={(event) => {
            event.preventDefault();
            if (value) save(value);
          }}
        >
          <input
            type="date"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            disabled={isPending}
            required
            className="rounded border border-gray-300 px-1 py-0.5 text-xs"
          />
          <button
            type="submit"
            disabled={isPending}
            className="text-xs font-medium text-gray-900 hover:underline"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setShowInput(false)}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowInput(true)}
          className="text-xs text-gray-400 hover:text-gray-700 hover:underline"
        >
          + Promised to pay
        </button>
      )}
      {error && (
        <p className="mt-0.5 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
