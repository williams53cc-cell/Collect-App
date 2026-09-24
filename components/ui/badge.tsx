export type BadgeTone =
  | "blue"
  | "red"
  | "green"
  | "gray"
  | "amber"
  | "purple";

const TONE_CLASSES: Record<BadgeTone, string> = {
  blue: "bg-blue-50 text-blue-700",
  red: "bg-red-50 text-red-700",
  green: "bg-green-50 text-green-700",
  gray: "bg-gray-100 text-gray-600",
  amber: "bg-amber-50 text-amber-700",
  purple: "bg-purple-50 text-purple-700",
};

export function Badge({
  tone,
  children,
}: {
  tone: BadgeTone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}

const CUSTOMER_STATUS_TONE: Record<string, BadgeTone> = {
  active: "blue",
  overdue: "red",
  paid: "green",
  closed: "gray",
};

export function CustomerStatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={CUSTOMER_STATUS_TONE[status] ?? "gray"}>{status}</Badge>
  );
}

const FOLLOW_UP_STATUS_TONE: Record<string, BadgeTone> = {
  pending: "amber",
  needs_call: "red",
  done: "green",
  skipped: "gray",
};

const FOLLOW_UP_STATUS_LABEL: Record<string, string> = {
  pending: "pending",
  needs_call: "needs a call",
  done: "done",
  skipped: "skipped",
};

export function FollowUpStatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={FOLLOW_UP_STATUS_TONE[status] ?? "gray"}>
      {FOLLOW_UP_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}
