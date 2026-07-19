"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AuditTimeline } from "@/components/AuditTimeline";
import { LineageDiagram } from "@/components/LineageDiagram";
import { MedallionDots } from "@/components/MedallionDots";
import { TierCard } from "@/components/TierCard";
import {
  FONT_DATA_CLASS,
  qualityScoreClass,
  statusToTierVariant,
} from "@/lib/styles";
import {
  ApiError,
  AuditLogEntry,
  DatasetVersionDetail,
  DatasetVersionStatus,
  LineageResponse,
  ValidationResult,
  getAuditLog,
  getDatasetVersion,
  getLineage,
  getValidationResult,
  promoteGold,
  promoteSilver,
  runValidation,
  suggestAggregation,
  triggerRepair,
} from "@/lib/api";

type ActionKey = "validate" | "repair" | "silver" | "gold";

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function statusBadgeClass(status: DatasetVersionStatus): string {
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

function formatStatus(status: DatasetVersionStatus): string {
  return status.replace(/_/g, " ");
}

function validationHasFailingChecks(validation: ValidationResult): boolean {
  return !(
    validation.null_check_passed &&
    validation.type_check_passed &&
    validation.duplicate_check_passed &&
    !validation.schema_drift_detected &&
    validation.date_format_passed
  );
}

function extractRepairScores(entries: AuditLogEntry[]): {
  before: number | null;
  after: number | null;
} {
  const repairEntry = [...entries]
    .reverse()
    .find(
      (entry) =>
        entry.event_type === "repair_succeeded" ||
        entry.event_type === "repair_failed",
    );

  if (!repairEntry) {
    return { before: null, after: null };
  }

  const details = repairEntry.details;
  const before =
    typeof details.quality_score_before === "number"
      ? details.quality_score_before
      : null;
  const after =
    typeof details.quality_score_after === "number"
      ? details.quality_score_after
      : null;

  return { before, after };
}

function repairWasAttempted(entries: AuditLogEntry[]): boolean {
  return entries.some((entry) => entry.event_type === "repair_attempted");
}

export default function DatasetVersionPage() {
  const params = useParams<{ datasetId: string; versionId: string }>();
  const datasetId = params.datasetId;
  const versionId = params.versionId;

  const [version, setVersion] = useState<DatasetVersionDetail | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [lineage, setLineage] = useState<LineageResponse | null>(null);
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([]);

  const [pageError, setPageError] = useState<string | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<ActionKey | null>(null);

  const loadPageData = useCallback(async () => {
    setIsLoading(true);
    setAuditLoading(true);
    setPageError(null);
    setAuditError(null);

    try {
      const [versionResponse, lineageResponse, auditResponse] = await Promise.all([
        getDatasetVersion(datasetId, versionId),
        getLineage(datasetId, versionId),
        getAuditLog(datasetId, versionId),
      ]);

      setVersion(versionResponse);
      setLineage(lineageResponse);
      setAuditEntries(auditResponse.entries);

      try {
        const validationResponse = await getValidationResult(datasetId, versionId);
        setValidation(validationResponse);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setValidation(null);
        } else {
          throw err;
        }
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setPageError(err.message);
      } else {
        setPageError("Could not reach the API. Check that the backend is running.");
      }
    } finally {
      setIsLoading(false);
      setAuditLoading(false);
    }
  }, [datasetId, versionId]);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  async function runAction(
    action: ActionKey,
    handler: () => Promise<void>,
  ): Promise<void> {
    setActionLoading(action);
    setActionError(null);

    try {
      await handler();
      await loadPageData();
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.message);
      } else {
        setActionError("Action failed. Please try again.");
      }
    } finally {
      setActionLoading(null);
    }
  }

  const repairScores = extractRepairScores(auditEntries);
  const hasRepairHistory =
    repairScores.before !== null && repairScores.after !== null;

  const currentScore =
    hasRepairHistory && repairScores.after !== null
      ? repairScores.after
      : validation?.quality_score ?? null;

  const showValidate = !validation;
  const showRepair =
    Boolean(validation) &&
    validationHasFailingChecks(validation!) &&
    !repairWasAttempted(auditEntries);
  const showPromoteSilver =
    version?.status === "repaired" || version?.status === "validated";
  const showPromoteGold = version?.status === "promoted_silver";

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <Link
        href="/datasets"
        className="text-sm text-gray-500 hover:text-gray-900"
      >
        ← Back to datasets
      </Link>

      {isLoading && (
        <p className="mt-8 text-sm text-gray-400">Loading version...</p>
      )}

      {pageError && (
        <div className="mt-8 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {pageError}
        </div>
      )}

      {!isLoading && !pageError && version && (
        <div className="mt-8 space-y-10">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">
                {version.dataset_name ?? "Dataset"}
              </h1>
              <p className={`mt-2 text-sm text-gray-500 ${FONT_DATA_CLASS}`}>
                Version {version.version_number}
              </p>
            </div>
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium capitalize ${statusBadgeClass(version.status)} ${FONT_DATA_CLASS}`}
            >
              {formatStatus(version.status)}
            </span>
          </div>

          {/* Quality score */}
          <TierCard variant="slate-muted" className="p-8">
            <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">
              Quality Score
            </h2>

            {currentScore === null ? (
              <p className="mt-4 text-sm text-gray-400">Not yet validated</p>
            ) : hasRepairHistory ? (
              <div className="mt-6 flex flex-wrap items-center gap-6">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Before repair</p>
                  <p
                    className={`text-3xl font-bold ${FONT_DATA_CLASS} ${qualityScoreClass(repairScores.before)}`}
                  >
                    {Math.round(repairScores.before!)}
                  </p>
                </div>
                <span className="text-2xl text-gray-400" aria-hidden>
                  →
                </span>
                <div className="text-center">
                  <p className="text-xs text-gray-500">After repair</p>
                  <p
                    className={`text-3xl font-bold ${FONT_DATA_CLASS} ${qualityScoreClass(repairScores.after)}`}
                  >
                    {Math.round(repairScores.after!)}
                  </p>
                </div>
              </div>
            ) : (
              <p
                className={`mt-4 text-4xl font-bold ${FONT_DATA_CLASS} ${qualityScoreClass(currentScore)}`}
              >
                {Math.round(currentScore)}
              </p>
            )}

            {validation && validation.issues.length > 0 && (
              <ul className="mt-6 list-inside list-disc text-sm text-gray-600">
                {validation.issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            )}
          </TierCard>

          {/* Lineage */}
          <TierCard
            variant={statusToTierVariant(version.status)}
            className="p-8"
          >
            <div className="mb-6 flex items-center gap-3">
              <MedallionDots />
              <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">
                Lineage
              </h2>
            </div>
            {lineage ? (
              <LineageDiagram stages={lineage.stages} />
            ) : (
              <p className="text-sm text-gray-400">Lineage unavailable</p>
            )}
          </TierCard>

          {/* Actions */}
          <section className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-500">
              Actions
            </h2>

            {actionError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {actionError}
              </div>
            )}

            <div className="flex flex-wrap gap-4">
              {showValidate && (
                <button
                  type="button"
                  disabled={actionLoading !== null}
                  onClick={() =>
                    runAction("validate", async () => {
                      const result = await runValidation(datasetId, versionId);
                      setValidation(result);
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-md bg-bronze px-4 py-2 text-sm font-medium text-white hover:bg-bronze/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading === "validate" && <Spinner />}
                  Run Validation
                </button>
              )}

              {showRepair && (
                <button
                  type="button"
                  disabled={actionLoading !== null}
                  onClick={() =>
                    runAction("repair", async () => {
                      await triggerRepair(datasetId, versionId);
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-md border border-bronze bg-white px-4 py-2 text-sm font-medium text-bronze hover:bg-bronze/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading === "repair" && <Spinner />}
                  Run Repair
                </button>
              )}

              {showPromoteSilver && (
                <button
                  type="button"
                  disabled={actionLoading !== null}
                  onClick={() =>
                    runAction("silver", async () => {
                      await promoteSilver(datasetId, versionId);
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-md bg-silver px-4 py-2 text-sm font-medium text-gray-800 hover:bg-silver/80 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading === "silver" && <Spinner />}
                  Promote to Silver
                </button>
              )}

              {showPromoteGold && (
                <button
                  type="button"
                  disabled={actionLoading !== null}
                  onClick={() =>
                    runAction("gold", async () => {
                      const suggestion = await suggestAggregation(
                        datasetId,
                        versionId,
                      );
                      await promoteGold(
                        datasetId,
                        versionId,
                        suggestion.aggregation_spec,
                      );
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-medium text-white hover:bg-gold/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading === "gold" && <Spinner />}
                  Promote to Gold
                </button>
              )}

              {!showValidate &&
                !showRepair &&
                !showPromoteSilver &&
                !showPromoteGold && (
                  <p className="text-sm text-gray-500">
                    No actions available for the current status.
                  </p>
                )}
            </div>
          </section>

          {/* Audit log */}
          <section>
            <h2 className="mb-5 text-sm font-medium uppercase tracking-wide text-gray-500">
              Audit Log
            </h2>
            <AuditTimeline
              entries={auditEntries}
              isLoading={auditLoading}
              error={auditError}
            />
          </section>
        </div>
      )}
    </div>
  );
}
