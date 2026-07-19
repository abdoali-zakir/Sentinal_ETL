"use client";

import Link from "next/link";
import { TierCard } from "@/components/TierCard";
import { useEffect, useState } from "react";
import {
  ApiError,
  DatasetListItem,
  DatasetVersionStatus,
  listDatasets,
} from "@/lib/api";
import {
  FONT_DATA_CLASS,
  qualityScoreClass,
  statusToTierVariant,
} from "@/lib/styles";

function statusBadgeClass(status: DatasetVersionStatus | null): string {
  if (!status) {
    return "bg-gray-100 text-gray-600 border-gray-200";
  }

  switch (status) {
    case "promoted_gold":
      return "bg-gold/15 text-gold border-gold/30";
    case "promoted_silver":
    case "promoted":
      return "bg-silver/20 text-gray-700 border-silver/40";
    case "failed":
      return "bg-gray-100 text-gray-500 border-gray-300";
    case "validated":
    case "repaired":
      return "bg-bronze/15 text-bronze border-bronze/30";
    default:
      return "bg-bronze/10 text-bronze/80 border-bronze/20";
  }
}

function formatStatus(status: DatasetVersionStatus | null): string {
  if (!status) return "—";
  return status.replace(/_/g, " ");
}

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<DatasetListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDatasets() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await listDatasets();
        setDatasets(response.datasets);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Could not reach the API. Check that the backend is running.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadDatasets();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-8 py-10">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Datasets</h1>
          <p className="mt-2 text-sm text-gray-500">
            All ingested datasets with their latest version status.
          </p>
        </div>
        <Link
          href="/upload"
          className="rounded-md bg-bronze px-4 py-2 text-sm font-medium text-white hover:bg-bronze/90"
        >
          Upload dataset
        </Link>
      </div>

      {isLoading && (
        <p className="text-sm text-gray-400">Loading datasets...</p>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {!isLoading && !error && datasets.length === 0 && (
        <TierCard variant="slate-muted" className="px-8 py-14 text-center">
          <p className="text-sm text-gray-500">No datasets yet.</p>
          <Link
            href="/upload"
            className="mt-3 inline-block text-sm font-medium text-bronze hover:underline"
          >
            Upload your first dataset
          </Link>
        </TierCard>
      )}

      {!isLoading && !error && datasets.length > 0 && (
        <div className="space-y-4">
          <div className="hidden grid-cols-6 gap-4 px-8 text-xs font-medium uppercase tracking-wide text-gray-500 md:grid">
            <span>Name</span>
            <span>Latest Version</span>
            <span>Status</span>
            <span>Quality Score</span>
            <span>Row Count</span>
            <span className="text-right">Actions</span>
          </div>

          {datasets.map((dataset) => (
            <TierCard
              key={dataset.id}
              variant={statusToTierVariant(dataset.status)}
              className="p-6 md:p-7"
            >
              <div className="grid gap-4 md:grid-cols-6 md:items-center md:gap-6">
                <div className="text-sm font-medium text-gray-900">
                  <span className="mb-1 block text-xs uppercase tracking-wide text-gray-400 md:hidden">
                    Name
                  </span>
                  {dataset.name}
                </div>

                <div className="text-sm text-gray-600">
                  <span className="mb-1 block text-xs uppercase tracking-wide text-gray-400 md:hidden">
                    Latest Version
                  </span>
                  <span className={FONT_DATA_CLASS}>
                    {dataset.version_number !== null
                      ? `v${dataset.version_number}`
                      : "—"}
                  </span>
                </div>

                <div>
                  <span className="mb-1 block text-xs uppercase tracking-wide text-gray-400 md:hidden">
                    Status
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadgeClass(dataset.status)} ${FONT_DATA_CLASS}`}
                  >
                    {formatStatus(dataset.status)}
                  </span>
                </div>

                <div className="text-sm">
                  <span className="mb-1 block text-xs uppercase tracking-wide text-gray-400 md:hidden">
                    Quality Score
                  </span>
                  <span
                    className={`${FONT_DATA_CLASS} ${qualityScoreClass(dataset.quality_score)}`}
                  >
                    {dataset.quality_score !== null
                      ? Math.round(dataset.quality_score)
                      : "—"}
                  </span>
                </div>

                <div className="text-sm text-gray-600">
                  <span className="mb-1 block text-xs uppercase tracking-wide text-gray-400 md:hidden">
                    Row Count
                  </span>
                  <span className={FONT_DATA_CLASS}>
                    {dataset.row_count ?? "—"}
                  </span>
                </div>

                <div className="text-sm md:text-right">
                  <span className="mb-1 block text-xs uppercase tracking-wide text-gray-400 md:hidden">
                    Actions
                  </span>
                  {dataset.version_id ? (
                    <Link
                      href={`/datasets/${dataset.id}/versions/${dataset.version_id}`}
                      className="font-medium text-bronze hover:underline"
                    >
                      View
                    </Link>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </div>
              </div>
            </TierCard>
          ))}
        </div>
      )}
    </div>
  );
}
