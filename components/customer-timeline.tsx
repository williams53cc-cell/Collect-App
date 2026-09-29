import type { CustomerEvent } from "@/lib/data/customer-events";

/** Timestamps here carry a time of day (unlike the plain due_date/
 * promised_date columns elsewhere in the app), since a contractor may log
 * several things about the same customer on the same day and wants to see
 * which came first. */
function formatEventTimestamp(createdAt: string): string {
  return new Date(createdAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CustomerTimeline({ events }: { events: CustomerEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        Nothing recorded yet — this fills in automatically as you work with
        this customer.
      </p>
    );
  }

  return (
    <ol className="space-y-4">
      {events.map((event) => (
        <li key={event.id} className="border-l-2 border-gray-200 pl-4">
          <p className="text-xs text-gray-400">
            {formatEventTimestamp(event.created_at)}
          </p>
          <p className="text-sm font-medium text-gray-900">
            {event.headline}
          </p>
          <p className="text-sm text-gray-600">{event.detail}</p>
        </li>
      ))}
    </ol>
  );
}
