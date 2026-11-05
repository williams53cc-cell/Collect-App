"use client";

import { useState } from "react";
import { buttonClassName, Button } from "@/components/ui/button";
import { invoiceShareMessage, whatsappLink } from "@/lib/whatsapp";

function fileNameFrom(response: Response, fallback: string): string {
  const header = response.headers.get("Content-Disposition") ?? "";
  const match = /filename="([^"]+)"/.exec(header);
  return match ? match[1] : fallback;
}

export function InvoiceShare({
  invoiceId,
  invoiceLabel,
  title,
  clientName,
  clientPhone,
  total,
  currency,
  dueOn,
  businessName,
}: {
  invoiceId: string;
  invoiceLabel: string;
  title: string;
  clientName: string;
  clientPhone: string | null;
  total: number;
  currency: string;
  /** Already formatted for reading, or null. */
  dueOn: string | null;
  businessName: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [fallbackLink, setFallbackLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pdfUrl = `/invoices/${invoiceId}/pdf`;
  const message = invoiceShareMessage({
    clientName,
    invoiceLabel,
    title,
    total,
    currency,
    dueOn,
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
      const fileName = fileNameFrom(response, `${invoiceLabel}.pdf`);
      const file = new File([blob], fileName, { type: "application/pdf" });

      if (
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({ files: [file], text: message });
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
    } catch (caught) {
      // Closing the share sheet is not an error.
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError("Could not prepare the PDF. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={pdfUrl}
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
          {busy ? "Preparing\u2026" : "Share on WhatsApp"}
        </Button>
      </div>

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

      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
