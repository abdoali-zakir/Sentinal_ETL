"use client";

import { DragEvent, FormEvent, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

type ColumnInfo = {
  name: string;
  dtype: string;
};

type SchemaDriftReport = {
  added_columns: string[];
  removed_columns: string[];
  type_changes: Record<string, { previous: string; current: string }>;
};

type DateFormatColumnReport = {
  non_iso8601_count: number;
  examples: string[];
};

type ValidationResult = {
  id: string;
  dataset_version_id: string;
  null_check_passed: boolean;
  null_report: Record<string, number>;
  type_check_passed: boolean;
  type_report: Record<string, unknown>;
  duplicate_check_passed: boolean;
  duplicate_count: number;
  schema_drift_detected: boolean;
  schema_drift_report: SchemaDriftReport | null;
  date_format_passed: boolean;
  date_format_report: Record<string, DateFormatColumnReport>;
  quality_score: number;
  created_at: string;
  issues: string[];
};

type UploadResult = {
  dataset_id: string;
  version_id: string;
  version_number: number;
  row_count: number;
  column_count: number;
  columns: ColumnInfo[];
  bronze_path: string;
  validation?: ValidationResult;
};

function qualityScoreColor(score: number): string {
  if (score >= 85) return "text-green-600";
  if (score >= 60) return "text-amber-500";
  return "text-red-600";
}

function qualityScoreAccent(score: number): string {
  if (score >= 85) return "accent-green";
  if (score >= 60) return "border-l-amber-400";
  return "accent-red";
}

function allValidationPassed(validation: ValidationResult): boolean {
  return (
    validation.null_check_passed &&
    validation.type_check_passed &&
    validation.duplicate_check_passed &&
    !validation.schema_drift_detected &&
    validation.date_format_passed &&
    validation.issues.length === 0
  );
}

function ValidationResultsSection({
  validation,
}: {
  validation: ValidationResult;
}) {
  const passed = allValidationPassed(validation);
  const score = Math.round(validation.quality_score);
  const nullColumns = Object.entries(validation.null_report)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);
  const dateFormatColumns = Object.entries(validation.date_format_report ?? {})
    .filter(([, report]) => report.non_iso8601_count > 0)
    .sort((a, b) => b[1].non_iso8601_count - a[1].non_iso8601_count);
  const driftReport = validation.schema_drift_report;

  return (
    <div className="mt-8 border-t border-black/5 pt-8">
      <h3 className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-muted">
        Validation Results
      </h3>

      <div
        className={`card-accent ${qualityScoreAccent(score)} mb-5 flex items-center gap-5 px-6 py-5`}
        style={{ borderLeftWidth: "4px" }}
        data-testid="quality-score-card"
      >
        <span
          className={`font-data text-[32px] font-bold leading-none ${qualityScoreColor(score)}`}
          data-testid="quality-score-value"
        >
          {score}
        </span>
        <div>
          <p className="text-sm font-semibold text-ink">Quality Score</p>
          <p className="font-data text-xs text-slate-muted">out of 100</p>
        </div>
      </div>

      {passed ? (
        <div
          className="card-accent accent-green px-5 py-4 text-sm font-medium text-green-800"
          data-testid="validation-passed"
        >
          All validation checks passed
        </div>
      ) : (
        <div className="space-y-3" data-testid="validation-issues">
          {validation.schema_drift_detected && driftReport && (
            <div className="card-accent border-l-amber-400 px-5 py-4 text-sm text-amber-900">
              <p className="font-semibold">Schema drift detected</p>
              <ul className="mt-2 space-y-1 text-xs">
                {driftReport.added_columns.length > 0 && (
                  <li>
                    <span className="font-medium">Added:</span>{" "}
                    <span className="font-data">
                      {driftReport.added_columns.join(", ")}
                    </span>
                  </li>
                )}
                {driftReport.removed_columns.length > 0 && (
                  <li>
                    <span className="font-medium">Removed:</span>{" "}
                    <span className="font-data">
                      {driftReport.removed_columns.join(", ")}
                    </span>
                  </li>
                )}
                {Object.keys(driftReport.type_changes).length > 0 && (
                  <li>
                    <span className="font-medium">Type changes:</span>
                    <ul className="mt-1 list-inside list-disc pl-1">
                      {Object.entries(driftReport.type_changes).map(
                        ([col, change]) => (
                          <li key={col} className="font-data">
                            {col}: {change.previous} &rarr; {change.current}
                          </li>
                        ),
                      )}
                    </ul>
                  </li>
                )}
              </ul>
            </div>
          )}

          {nullColumns.length > 0 && (
            <details className="card-accent accent-muted overflow-hidden text-sm">
              <summary className="cursor-pointer select-none px-5 py-3.5 font-medium text-ink">
                Null values ({nullColumns.length} column
                {nullColumns.length !== 1 ? "s" : ""})
              </summary>
              <div className="border-t border-black/5 px-5 py-4">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-muted">
                      <th className="pb-2 pr-4 font-medium">Column</th>
                      <th className="pb-2 font-medium">Null count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {nullColumns.map(([column, count]) => (
                      <tr key={column}>
                        <td className="py-2 pr-4 font-data font-medium text-ink">
                          {column}
                        </td>
                        <td className="py-2 font-data text-slate-muted">
                          {count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}

          {validation.duplicate_count > 0 && (
            <details className="card-accent accent-muted overflow-hidden text-sm">
              <summary className="cursor-pointer select-none px-5 py-3.5 font-medium text-ink">
                Duplicate rows
              </summary>
              <div className="border-t border-black/5 px-5 py-4 text-slate-muted">
                <span className="font-data text-ink">
                  {validation.duplicate_count}
                </span>{" "}
                duplicate row
                {validation.duplicate_count !== 1 ? "s" : ""} found
              </div>
            </details>
          )}

          {!validation.date_format_passed && dateFormatColumns.length > 0 && (
            <details className="card-accent accent-muted overflow-hidden text-sm">
              <summary className="cursor-pointer select-none px-5 py-3.5 font-medium text-ink">
                Date format ({dateFormatColumns.length} column
                {dateFormatColumns.length !== 1 ? "s" : ""} with non-ISO8601
                values)
              </summary>
              <div className="border-t border-black/5 px-5 py-4">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-muted">
                      <th className="pb-2 pr-4 font-medium">Column</th>
                      <th className="pb-2 pr-4 font-medium">Non-ISO8601</th>
                      <th className="pb-2 font-medium">Examples</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {dateFormatColumns.map(([column, report]) => (
                      <tr key={column}>
                        <td className="py-2 pr-4 font-data font-medium text-ink">
                          {column}
                        </td>
                        <td className="py-2 pr-4 font-data text-slate-muted">
                          {report.non_iso8601_count}
                        </td>
                        <td className="py-2 font-data text-slate-muted">
                          {report.examples.join(", ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

const ACCEPTED_EXTENSIONS = [".csv", ".json"];

function isAcceptedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function parseErrorDetail(body: unknown): string {
  if (typeof body === "object" && body !== null && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((item) =>
          typeof item === "object" && item !== null && "msg" in item
            ? String((item as { msg: unknown }).msg)
            : JSON.stringify(item),
        )
        .join(", ");
    }
  }
  return "Upload failed. Please try again.";
}

export default function UploadPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [datasetName, setDatasetName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File | null) {
    if (!file) return;
    if (!isAcceptedFile(file)) {
      setError("Only CSV and JSON files are supported.");
      setSelectedFile(null);
      return;
    }
    setError(null);
    setResult(null);
    setSelectedFile(file);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    handleFile(event.dataTransfer.files[0] ?? null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);

    if (!datasetName.trim()) {
      setError("Dataset name is required.");
      return;
    }

    if (!selectedFile) {
      setError("Please select a CSV or JSON file to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("name", datasetName.trim());
    formData.append("file", selectedFile);

    setIsUploading(true);

    try {
      const response = await apiFetch("/api/datasets/upload", {
        method: "POST",
        body: formData,
      });

      const body = await response.json();

      if (!response.ok) {
        setError(parseErrorDetail(body));
        return;
      }

      setResult(body as UploadResult);
    } catch {
      setError("Could not reach the API. Check that the backend is running.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12" data-testid="upload-page">
      <header className="mb-10 animate-fade-up">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-bronze">
          Bronze Ingestion
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Upload Dataset
        </h1>
        <p className="mt-3 text-base text-slate-muted">
          Ingest a CSV or JSON file into the Bronze layer. Sentinel validates
          and auto-repairs on arrival.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6 animate-fade-up" style={{ animationDelay: "0.05s" }}>
        <div>
          <label
            htmlFor="dataset-name"
            className="mb-2 block text-sm font-medium text-ink"
          >
            Dataset name
          </label>
          <input
            id="dataset-name"
            type="text"
            value={datasetName}
            onChange={(event) => setDatasetName(event.target.value)}
            placeholder="e.g. customer-orders"
            data-testid="dataset-name-input"
            className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-ink shadow-card outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/25"
            disabled={isUploading}
          />
        </div>

        <div>
          <span className="mb-2 block text-sm font-medium text-ink">
            Data file
          </span>
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                inputRef.current?.click();
              }
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            data-testid="dropzone"
            className={`cursor-pointer rounded-xl border-2 border-dashed bg-white p-12 text-center shadow-card transition-colors ${
              isDragging
                ? "border-bronze bg-bronze/[0.06]"
                : "border-black/10 hover:border-bronze/50"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.json"
              className="hidden"
              onChange={(event) =>
                handleFile(event.target.files?.[0] ?? null)
              }
            />
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-bronze/10">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#A86B36"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3v12" />
                <path d="m7 8 5-5 5 5" />
                <path d="M5 21h14" />
              </svg>
            </div>
            <p className="text-sm font-medium text-ink">
              Drag and drop a file here, or click to browse
            </p>
            <p className="mt-1.5 font-data text-xs text-slate-muted">
              Accepted formats: .csv, .json
            </p>
            {selectedFile && (
              <p className="mt-4 text-sm text-slate-muted" data-testid="selected-file">
                Selected:{" "}
                <span className="font-data font-medium text-bronze">
                  {selectedFile.name}
                </span>
              </p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isUploading}
          data-testid="upload-submit"
          className="inline-flex items-center gap-2 rounded-full bg-bronze px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-bronze/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isUploading && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          {isUploading ? "Uploading\u2026" : "Upload to Bronze"}
        </button>
      </form>

      {error && (
        <div
          role="alert"
          data-testid="upload-error"
          className="card-accent accent-red mt-6 px-5 py-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {result && (
        <div
          className="card mt-8 animate-fade-up p-7"
          data-testid="upload-result"
        >
          <div className="mb-6 flex items-center gap-3">
            <h2 className="text-lg font-semibold text-ink">Upload successful</h2>
            <span className="inline-flex items-center rounded-full bg-bronze/15 px-2.5 py-0.5 font-data text-[11px] font-semibold text-bronze">
              promoted_bronze
            </span>
          </div>

          <dl className="mb-7 grid gap-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="mb-1 text-xs uppercase tracking-wide text-slate-muted">
                Dataset ID
              </dt>
              <dd className="font-data text-xs text-ink" data-testid="result-dataset-id">
                {result.dataset_id}
              </dd>
            </div>
            <div>
              <dt className="mb-1 text-xs uppercase tracking-wide text-slate-muted">
                Version
              </dt>
              <dd className="font-data text-sm font-semibold text-ink">
                v{result.version_number}
              </dd>
            </div>
            <div>
              <dt className="mb-1 text-xs uppercase tracking-wide text-slate-muted">
                Row count
              </dt>
              <dd className="font-data text-sm font-semibold text-ink">
                {result.row_count}
              </dd>
            </div>
            <div>
              <dt className="mb-1 text-xs uppercase tracking-wide text-slate-muted">
                Column count
              </dt>
              <dd className="font-data text-sm font-semibold text-ink">
                {result.column_count}
              </dd>
            </div>
          </dl>

          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-muted">
            Columns
          </h3>
          <div className="overflow-hidden rounded-xl border border-black/5">
            <table className="min-w-full divide-y divide-black/5 text-sm">
              <thead className="bg-paper">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-muted">
                    Name
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-muted">
                    Dtype
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 bg-white">
                {result.columns.map((column) => (
                  <tr key={column.name} className="transition-colors hover:bg-paper/60">
                    <td className="px-4 py-2.5 font-data font-medium text-ink">
                      {column.name}
                    </td>
                    <td className="px-4 py-2.5 font-data text-xs text-slate-muted">
                      {column.dtype}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result.validation && (
            <ValidationResultsSection validation={result.validation} />
          )}
        </div>
      )}
    </div>
  );
}
