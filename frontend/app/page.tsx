"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

const staticCards = ["Data Quality Score", "Recent Runs", "Storage Tiers"];

type HealthStatus = "loading" | "ok" | "error";

export default function Home() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>("loading");

  useEffect(() => {
    let cancelled = false;

    async function checkHealth() {
      try {
        const response = await apiFetch("/health");
        if (!response.ok) throw new Error("Health check failed");

        const data = await response.json();
        if (cancelled) return;

        setHealthStatus(data.status === "ok" ? "ok" : "error");
      } catch {
        if (!cancelled) setHealthStatus("error");
      }
    }

    checkHealth();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="mb-8 text-2xl font-semibold">Dashboard</h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-sm font-medium text-gray-500">
            Pipeline Health
          </h2>
          {healthStatus === "loading" && (
            <p className="text-sm text-gray-400">Checking...</p>
          )}
          {healthStatus === "ok" && (
            <p className="text-sm font-medium text-green-600">Backend: ok</p>
          )}
          {healthStatus === "error" && (
            <p className="text-sm font-medium text-red-600">
              Backend: unreachable
            </p>
          )}
        </div>

        {staticCards.map((title) => (
          <div
            key={title}
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
          >
            <h2 className="mb-2 text-sm font-medium text-gray-500">{title}</h2>
            <p className="text-sm text-gray-400">No data yet</p>
          </div>
        ))}
      </div>
    </div>
  );
}
