"use client";

import { AuditLogEntry } from "@/lib/api";
import { TierCard } from "@/components/TierCard";
import { FONT_DATA_CLASS } from "@/lib/styles";

const EVENT_BADGE_STYLES: Record<string, string> = {
  upload: "bg-gray-100 text-gray-700 border-gray-200",
  validation_run: "bg-blue-100 text-blue-800 border-blue-200",
  repair_attempted: "bg-yellow-100 text-yellow-800 border-yellow-200",
  repair_succeeded: "bg-green-100 text-green-800 border-green-200",
  repair_failed: "bg-red-100 text-red-800 border-red-200",
  promotion: "bg-purple-100 text-purple-800 border-purple-200",
};

function eventBadgeClass(eventType: string): string {
  return (
    EVENT_BADGE_STYLES[eventType] ??
    "bg-gray-100 text-gray-700 border-gray-200"
  );
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString();
}

type AuditTimelineProps = {
  entries: AuditLogEntry[];
  isLoading?: boolean;
  error?: string | null;
};

export function AuditTimeline({
  entries,
  isLoading = false,
  error = null,
}: AuditTimelineProps) {
  if (isLoading) {
    return <p className="text-sm text-gray-500">Loading audit log...</p>;
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {error}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-500">No audit entries for this version.</p>
    );
  }

  return (
    <ol className="relative space-y-6">
      {entries.map((entry) => (
        <li key={entry.id} className="relative">
          <TierCard variant="slate-muted" className="p-5">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <time className={`text-xs text-gray-500 ${FONT_DATA_CLASS}`}>
                {formatTimestamp(entry.created_at)}
              </time>
              <span
                className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${eventBadgeClass(entry.event_type)} ${FONT_DATA_CLASS}`}
              >
                {entry.event_type}
              </span>
              <span className="text-xs text-gray-400">{entry.actor}</span>
            </div>

            <details className="text-sm">
              <summary className="cursor-pointer font-medium text-gray-700">
                Details
              </summary>
              <pre
                className={`mt-3 overflow-x-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-800 ${FONT_DATA_CLASS}`}
              >
                {JSON.stringify(entry.details, null, 2)}
              </pre>
            </details>
          </TierCard>
        </li>
      ))}
    </ol>
  );
}
