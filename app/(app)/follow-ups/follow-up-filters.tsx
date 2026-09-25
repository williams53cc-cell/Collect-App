import Link from "next/link";
import { FOLLOW_UP_FILTERS, type FollowUpFilterKey } from "@/lib/data/follow-ups";

export function FollowUpFilters({ active }: { active: FollowUpFilterKey }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {FOLLOW_UP_FILTERS.map((filter) => {
        const isActive = filter.key === active;
        const href =
          filter.key === "all" ? "/follow-ups" : `/follow-ups?filter=${filter.key}`;
        return (
          <Link
            key={filter.key}
            href={href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {filter.label}
          </Link>
        );
      })}
    </div>
  );
}
