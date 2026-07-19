"use client";

import { TierCard } from "@/components/TierCard";
import { FONT_DATA_CLASS, qualityScoreClass } from "@/lib/styles";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DatasetListItem,
  PipelineRunItem,
  PipelineRunsSummary,
  StorageTierCounts,
  getHealth,
  getPipelineRunsSummary,
  getRecentPipelineRuns,
  getStorageTierSummary,
  listDatasets,
} from "@/lib/api";

const POLL_INTERVAL_MS = 10_000;

type HealthStatus = "loading" | "ok" | "error";

type DashboardData = {
  health: HealthStatus;
  pipelineSummary: PipelineRunsSummary | null;
  datasets: DatasetListItem[];
  recentRuns: PipelineRunItem[];
  storageTiers: StorageTierCounts | null;
  storageTotal: number;
};

const EMPTY_DASHBOARD: DashboardData = {
  health: "loading",
  pipelineSummary: null,
  datasets: [],
  recentRuns: [],
  storageTiers: null,
  storageTotal: 0,
};

const STORAGE_TIER_ORDER: (keyof StorageTierCounts)[] = [
  "uploaded",
  "validated",
  "repaired",
  "promoted_silver",
  "promoted_gold",
  "failed",
];

const STORAGE_TIER_LABELS: Record<keyof StorageTierCounts, string> = {
  uploaded: "Uploaded",
  validated: "Validated",
  repaired: "Repaired",
  promoted_silver: "Silver",
  promoted_gold: "Gold",
  failed: "Failed",
};

const STORAGE_TIER_COLORS: Record<keyof StorageTierCounts, string> = {
  uploaded: "#A86B3640",
  validated: "#A86B36",
  repaired: "#A86B3680",
  promoted_silver: "#B0B7BD",
  promoted_gold: "#D4AF37",
  failed: "#9CA3AF",
};

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString();
}

function truncateName(name: string, max = 12): string {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

function runStatusClass(status: string): string {
  if (status === "success") return "text-green-600";
  if (status === "failed") return "text-red-600";
  return "text-yellow-600";
}

export default function Home() {
  const [data, setData] = useState<DashboardData>(EMPTY_DASHBOARD);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    const next: DashboardData = { ...EMPTY_DASHBOARD, health: "error" };

    try {
      const healthResponse = await getHealth();
      next.health = healthResponse.status === "ok" ? "ok" : "error";
    } catch {
      next.health = "error";
    }

    try {
      const [pipelineSummary, datasetsResponse, recentResponse, storageResponse] =
        await Promise.all([
          getPipelineRunsSummary(),
          listDatasets(),
          getRecentPipelineRuns(5),
          getStorageTierSummary(),
        ]);

      next.pipelineSummary = pipelineSummary;
      next.datasets = datasetsResponse.datasets;
      next.recentRuns = recentResponse.runs;
      next.storageTiers = storageResponse.counts;
      next.storageTotal = storageResponse.total_versions;
    } catch {
      // Keep partial data (health) when dashboard endpoints fail.
    }

    setData(next);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadDashboard();
    const intervalId = setInterval(loadDashboard, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [loadDashboard]);

  const qualityChartData = useMemo(
    () =>
      data.datasets
        .filter((dataset) => dataset.quality_score !== null)
        .map((dataset) => ({
          name: truncateName(dataset.name),
          fullName: dataset.name,
          score: Math.round(dataset.quality_score!),
        })),
    [data.datasets],
  );

  const averageQualityScore = useMemo(() => {
    const scores = data.datasets
      .map((dataset) => dataset.quality_score)
      .filter((score): score is number => score !== null);
    if (scores.length === 0) return null;
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }, [data.datasets]);

  const storageSegments = useMemo(() => {
    if (!data.storageTiers || data.storageTotal === 0) return [];
    return STORAGE_TIER_ORDER.filter((key) => data.storageTiers![key] > 0).map(
      (key) => ({
        key,
        label: STORAGE_TIER_LABELS[key],
        count: data.storageTiers![key],
        color: STORAGE_TIER_COLORS[key],
        width: (data.storageTiers![key] / data.storageTotal) * 100,
      }),
    );
  }, [data.storageTiers, data.storageTotal]);

  const pipelineHealthVariant =
    data.health === "ok" ? "gold" : "slate-muted";

  return (
    <div className="mx-auto max-w-7xl px-8 py-10">
      <div className="mb-10 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className={`text-xs text-gray-400 ${FONT_DATA_CLASS}`}>
          Refreshes every 10s
        </p>
      </div>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {/* Pipeline Health */}
        <TierCard variant={pipelineHealthVariant} className="p-8">
          <h2 className="mb-3 text-sm font-medium text-gray-500">
            Pipeline Health
          </h2>
          {isLoading && data.health === "loading" && (
            <p className="text-sm text-gray-400">Checking...</p>
          )}
          {data.health === "ok" && (
            <p className="text-sm font-medium text-green-600">Backend: ok</p>
          )}
          {data.health === "error" && (
            <p className="text-sm font-medium text-red-600">
              Backend: unreachable
            </p>
          )}
          {data.pipelineSummary && (
            <div className="mt-5 space-y-2 text-sm">
              <p className="text-gray-600">
                Last{" "}
                <span className={FONT_DATA_CLASS}>
                  {data.pipelineSummary.period_hours}h
                </span>
                :{" "}
                <span className={`font-medium ${FONT_DATA_CLASS}`}>
                  {data.pipelineSummary.total}
                </span>{" "}
                runs
              </p>
              <p>
                <span
                  className={`font-medium text-green-600 ${FONT_DATA_CLASS}`}
                >
                  {data.pipelineSummary.counts.success}
                </span>{" "}
                success
              </p>
              <p>
                <span
                  className={`font-medium text-red-600 ${FONT_DATA_CLASS}`}
                >
                  {data.pipelineSummary.counts.failed}
                </span>{" "}
                failed
              </p>
              {data.pipelineSummary.counts.running > 0 && (
                <p>
                  <span
                    className={`font-medium text-yellow-600 ${FONT_DATA_CLASS}`}
                  >
                    {data.pipelineSummary.counts.running}
                  </span>{" "}
                  running
                </p>
              )}
            </div>
          )}
        </TierCard>

        {/* Data Quality Score */}
        <TierCard variant="slate-muted" className="p-8">
          <h2 className="mb-3 text-sm font-medium text-gray-500">
            Data Quality Score
          </h2>
          {averageQualityScore === null ? (
            <p className="text-sm text-gray-400">No quality data yet</p>
          ) : (
            <>
              <p
                className={`text-3xl font-bold ${FONT_DATA_CLASS} ${qualityScoreClass(averageQualityScore)}`}
              >
                {Math.round(averageQualityScore)}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Average across datasets
              </p>
            </>
          )}
          {qualityChartData.length > 0 && (
            <div className="mt-5 h-28">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={qualityChartData} margin={{ top: 4, bottom: 0 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={40}
                  />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={28} />
                  <Tooltip
                    formatter={(value) => [`${value}`, "Score"]}
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.fullName ?? ""
                    }
                  />
                  <Bar dataKey="score" fill="#A86B36" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </TierCard>

        {/* Recent Runs */}
        <TierCard variant="slate-muted" className="p-8">
          <h2 className="mb-3 text-sm font-medium text-gray-500">
            Recent Runs
          </h2>
          {data.recentRuns.length === 0 ? (
            <p className="text-sm text-gray-400">No pipeline runs yet</p>
          ) : (
            <ul className="space-y-4">
              {data.recentRuns.map((run) => (
                <li key={run.id} className="text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium capitalize text-gray-800">
                      {run.stage}
                    </span>
                    <span
                      className={`font-medium capitalize ${runStatusClass(run.status)} ${FONT_DATA_CLASS}`}
                    >
                      {run.status}
                    </span>
                  </div>
                  <time className={`text-gray-400 ${FONT_DATA_CLASS}`}>
                    {formatTimestamp(run.started_at)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </TierCard>

        {/* Storage Tiers */}
        <TierCard variant="slate-muted" className="p-8">
          <h2 className="mb-3 text-sm font-medium text-gray-500">
            Storage Tiers
          </h2>
          {storageSegments.length === 0 ? (
            <p className="text-sm text-gray-400">No versions yet</p>
          ) : (
            <>
              <p className="mb-4 text-xs text-gray-500">
                <span className={FONT_DATA_CLASS}>{data.storageTotal}</span>{" "}
                version{data.storageTotal !== 1 ? "s" : ""} by status
              </p>
              <div className="flex h-5 w-full overflow-hidden rounded-full">
                {storageSegments.map((segment) => (
                  <div
                    key={segment.key}
                    title={`${segment.label}: ${segment.count}`}
                    className="h-full transition-all"
                    style={{
                      width: `${segment.width}%`,
                      backgroundColor: segment.color,
                    }}
                  />
                ))}
              </div>
              <ul className="mt-5 space-y-2">
                {STORAGE_TIER_ORDER.map((key) => {
                  const count = data.storageTiers?.[key] ?? 0;
                  if (count === 0) return null;
                  return (
                    <li
                      key={key}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="flex items-center gap-2 text-gray-600">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: STORAGE_TIER_COLORS[key] }}
                        />
                        {STORAGE_TIER_LABELS[key]}
                      </span>
                      <span
                        className={`font-medium text-gray-800 ${FONT_DATA_CLASS}`}
                      >
                        {count}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </TierCard>
      </div>
    </div>
  );
}
