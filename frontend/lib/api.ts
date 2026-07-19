const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiFetch(
  path: string,
  options?: RequestInit,
): Promise<Response> {
  const url = `${API_BASE_URL}${path}`;

  if (options?.body instanceof FormData) {
    const { headers, ...rest } = options;
    const requestHeaders = new Headers(headers);
    requestHeaders.delete("Content-Type");
    return fetch(url, { ...rest, headers: requestHeaders });
  }

  return fetch(url, options);
}

async function parseJson<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) {
    const detail =
      typeof body.detail === "string"
        ? body.detail
        : "Request failed";
    throw new ApiError(detail, response.status);
  }
  return body as T;
}

export type DatasetVersionStatus =
  | "uploaded"
  | "validating"
  | "validated"
  | "repairing"
  | "repaired"
  | "promoted"
  | "promoted_silver"
  | "promoted_gold"
  | "failed";

export type SchemaDriftReport = {
  added_columns: string[];
  removed_columns: string[];
  type_changes: Record<string, { previous: string; current: string }>;
};

export type DateFormatColumnReport = {
  non_iso8601_count: number;
  examples: string[];
};

export type ValidationResult = {
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

export type RepairActionLog = {
  action_type: string;
  target_column: string | null;
  rows_affected: number;
  before_value_sample?: unknown;
  after_value_sample?: unknown;
  success?: boolean;
  rows_unparseable?: number;
};

export type RepairResult = {
  status: string;
  repaired_path: string | null;
  actions_taken: RepairActionLog[];
  quality_score_before: number | null;
  quality_score_after: number | null;
  message?: string;
};

export type AuditLogEntry = {
  id: string;
  dataset_version_id: string;
  event_type: string;
  actor: string;
  details: Record<string, unknown>;
  created_at: string;
};

export type AuditLogResponse = {
  entries: AuditLogEntry[];
};

export type LineageStage = {
  stage: string;
  path: string | null;
  timestamp: string | null;
};

export type LineageResponse = {
  dataset_id: string;
  version_id: string;
  version_number: number;
  status: DatasetVersionStatus;
  stages: LineageStage[];
};

export type SilverPromotionResult = {
  row_count: number;
  column_count: number;
  output_path: string;
};

export type AggregationMetric = {
  column: string;
  agg: string;
  alias: string;
};

export type AggregationSpec = {
  group_by: string[];
  metrics: AggregationMetric[];
};

export type GoldPromotionResult = {
  row_count: number;
  output_path: string;
  query_used: string;
};

export type DatasetListItem = {
  id: string;
  name: string;
  created_at: string;
  version_id: string | null;
  version_number: number | null;
  status: DatasetVersionStatus | null;
  quality_score: number | null;
  row_count: number | null;
};

export type ListDatasetsResponse = {
  datasets: DatasetListItem[];
};

export type DatasetVersionDetail = {
  id: string;
  dataset_id: string;
  dataset_name: string | null;
  version_number: number;
  bronze_path: string;
  silver_path: string | null;
  gold_path: string | null;
  status: DatasetVersionStatus;
  row_count: number | null;
  promoted_to_silver_at: string | null;
  promoted_to_gold_at: string | null;
  created_at: string;
};

export type SuggestAggregationResponse = {
  aggregation_spec: AggregationSpec;
  silver_path: string;
};

export type HealthResponse = {
  status: string;
  service: string;
};

export type PipelineRunsSummary = {
  period_hours: number;
  counts: {
    success: number;
    failed: number;
    running: number;
  };
  total: number;
};

export type PipelineRunItem = {
  id: string;
  dataset_version_id: string;
  stage: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  error_message: string | null;
};

export type RecentPipelineRunsResponse = {
  runs: PipelineRunItem[];
};

export type StorageTierCounts = {
  uploaded: number;
  validated: number;
  repaired: number;
  promoted_silver: number;
  promoted_gold: number;
  failed: number;
};

export type StorageTierSummary = {
  counts: StorageTierCounts;
  total_versions: number;
};

export async function getHealth(): Promise<HealthResponse> {
  const response = await apiFetch("/health");
  return parseJson<HealthResponse>(response);
}

export async function getPipelineRunsSummary(): Promise<PipelineRunsSummary> {
  const response = await apiFetch("/api/pipeline-runs/summary");
  return parseJson<PipelineRunsSummary>(response);
}

export async function getRecentPipelineRuns(
  limit = 5,
): Promise<RecentPipelineRunsResponse> {
  const response = await apiFetch(`/api/pipeline-runs/recent?limit=${limit}`);
  return parseJson<RecentPipelineRunsResponse>(response);
}

export async function getStorageTierSummary(): Promise<StorageTierSummary> {
  const response = await apiFetch("/api/pipeline-runs/storage-tiers");
  return parseJson<StorageTierSummary>(response);
}

export async function listDatasets(): Promise<ListDatasetsResponse> {
  const response = await apiFetch("/api/datasets");
  return parseJson<ListDatasetsResponse>(response);
}

export async function getDatasetVersion(
  datasetId: string,
  versionId: string,
): Promise<DatasetVersionDetail> {
  const response = await apiFetch(
    `/api/datasets/${datasetId}/versions/${versionId}`,
  );
  return parseJson<DatasetVersionDetail>(response);
}

export async function getValidationResult(
  datasetId: string,
  versionId: string,
): Promise<ValidationResult> {
  const response = await apiFetch(
    `/api/datasets/${datasetId}/versions/${versionId}/validation`,
  );
  return parseJson<ValidationResult>(response);
}

export async function runValidation(
  datasetId: string,
  versionId: string,
): Promise<ValidationResult> {
  const response = await apiFetch(
    `/api/datasets/${datasetId}/versions/${versionId}/validate`,
    { method: "POST" },
  );
  return parseJson<ValidationResult>(response);
}

export async function suggestAggregation(
  datasetId: string,
  versionId: string,
): Promise<SuggestAggregationResponse> {
  const response = await apiFetch(
    `/api/datasets/${datasetId}/versions/${versionId}/suggest-aggregation`,
  );
  return parseJson<SuggestAggregationResponse>(response);
}

export async function getAuditLog(
  datasetId: string,
  versionId: string,
): Promise<AuditLogResponse> {
  const response = await apiFetch(
    `/api/datasets/${datasetId}/versions/${versionId}/audit-log`,
  );
  return parseJson<AuditLogResponse>(response);
}

export async function getLineage(
  datasetId: string,
  versionId: string,
): Promise<LineageResponse> {
  const response = await apiFetch(
    `/api/datasets/${datasetId}/versions/${versionId}/lineage`,
  );
  return parseJson<LineageResponse>(response);
}

export async function triggerRepair(
  datasetId: string,
  versionId: string,
): Promise<RepairResult> {
  const response = await apiFetch(
    `/api/datasets/${datasetId}/versions/${versionId}/repair`,
    { method: "POST" },
  );
  return parseJson<RepairResult>(response);
}

export async function promoteSilver(
  datasetId: string,
  versionId: string,
): Promise<SilverPromotionResult> {
  const response = await apiFetch(
    `/api/datasets/${datasetId}/versions/${versionId}/promote/silver`,
    { method: "POST" },
  );
  return parseJson<SilverPromotionResult>(response);
}

export async function promoteGold(
  datasetId: string,
  versionId: string,
  aggregationSpec: AggregationSpec,
): Promise<GoldPromotionResult> {
  const response = await apiFetch(
    `/api/datasets/${datasetId}/versions/${versionId}/promote/gold`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aggregation_spec: aggregationSpec }),
    },
  );
  return parseJson<GoldPromotionResult>(response);
}
