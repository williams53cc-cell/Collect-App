import { Badge, type BadgeTone } from "@/components/ui/badge";
import { INVOICE_STATUS_LABELS } from "@/lib/invoices";
import type { InvoiceStatus } from "@/types/database";

const TONE: Record<InvoiceStatus, BadgeTone> = {
  draft: "gray",
  issued: "blue",
  void: "red",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <Badge tone={TONE[status]}>{INVOICE_STATUS_LABELS[status]}</Badge>;
}
