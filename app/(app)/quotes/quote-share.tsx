"use client";

import { useState, useTransition } from "react";
import { buttonClassName, Button } from "@/components/ui/button";
import {
  quoteShareMessage,
  whatsappLink,
} from "@/lib/whatsapp";
import type { QuoteStatus } from "@/types/database";
import { updateQuoteStatus } from "./actions";

function fileNameFrom(response: Response, fallback: string): string {
  const header = response.headers.get("Content-Disposition") ?? "";
  const match = /filename="([^"]+)"/.exec(header);
  return match ? match[1] : fallback;
}

export function QuoteShare({
  quoteId,
  quoteLabel,
  title,
  clientName,
  clientPhone,
  total,
  currency,
  businessName,
  status,
}: {
  quoteId: string;
  quoteLabel: string;
  title: string;
  clientName: string;
  clientPhone: string | null;
  total: number;
  currency: string;
  businessName: string | null;
  status: QuoteStatus;
}) {
  const [busy, setBusy] = useState(false);
  const [shared, setShared] = useState(false);
  const [fallbackLink, setFallbackLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const pdfUrl = `/quotes/${quoteId}/pdf`;
  const message = quoteShareMessage({
    clientName,
    quoteLabel,
    title,
    total,
    currency,
    businessName,
  });

  async function shareOnWhatsApp() {
    setBusy(true);
    setError(null);
    setFallbackLink(null);
    try {
      const response = await fetch(pdfUrl);
      if (!response.ok) throw new Error("PDF failed");
      const blob = await response.blob();
      const fileName = fileNameFrom(response, `${quoteLabel}.pdf`);
      const file = new File([blob], fileName, { type: "application/pdf" });

      if (
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({ files: [file], text: message });
        setShared(true);
        return;
      }

      // This device can't attach a file by itself: save the PDF and give a
      // link that opens WhatsApp with the message ready.
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setFallbackLink(whatsappLink(clientPhone, message));
      setShared(true);
    } catch (caught) {
      // Closing the share sheet is not an error.
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError("Could not prepare the PDF. Save the quote and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={pdfUrl}
          target="_blank"
          rel="noreferrer"
          className={buttonClassName({ variant: "secondary", size: "sm" })}
        >
          View PDF
        </a>
        <a
          href={`${pdfUrl}?download=1`}
          className={buttonClassName({ variant: "secondary", size: "sm" })}
        >
          Download PDF
        </a>
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={shareOnWhatsApp}
        >
          {busy ? "Preparing…" : "Share on WhatsApp"}
        </Button>
      </div>

      <p className="text-xs text-gray-400">
        The PDF uses the saved quote, so save any changes first.
      </p>

      {fallbackLink && (
        <p className="text-sm text-gray-700">
          The PDF is saved on your device.{" "}
          <a
            href={fallbackLink}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-blue-600 hover:underline"
          >
            Open WhatsApp
          </a>{" "}
          and attach it.
        </p>
      )}

      {shared && status === "draft" && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
          <span>Sent it to your customer?</span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await updateQuoteStatus(quoteId, "sent");
                if (result?.error) setError(result.error);
              })
            }
          >
            Mark as Sent
          </Button>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
