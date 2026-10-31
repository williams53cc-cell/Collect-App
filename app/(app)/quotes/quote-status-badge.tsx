import { Badge, type BadgeTone } from "@/components/ui/badge";
import { QUOTE_STATUS_LABELS } from "@/lib/quotes";
import type { QuoteStatus } from "@/types/database";

const TONE: Record<QuoteStatus, BadgeTone> = {
  draft: "gray",
  sent: "blue",
  accepted: "green",
  declined: "red",
};

export function QuoteStatusBadge({
  status,
  expired = false,
}: {
  status: QuoteStatus;
  expired?: boolean;
}) {
  if (expired) return <Badge tone="amber">Expired</Badge>;
  return <Badge tone={TONE[status]}>{QUOTE_STATUS_LABELS[status]}</Badge>;
}
