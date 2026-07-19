"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type HealthStatus = "loading" | "ok" | "error";

const tierCards = [
  {
    title: "Data Quality Score",
    hint: "Average across datasets",
    accent: "accent-gold",
    label: "GOLD",
    labelClass: "bg-gold/15 text-[#8a6d1a]",
  },
  {
    title: "Recent Runs",
    hint: "Last 5 pipeline runs",
    accent: "accent-silver",
    label: "SILVER",
    labelClass: "bg-silver/20 text-ink",
  },
  {
    title: "Storage Tiers",
    hint: "Versions per medallion stage",
    accent: "accent-bronze",
    label: "BRONZE",
    labelClass: "bg-bronze/15 text-bronze",
  },
];

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

  const healthAccent =
    healthStatus === "ok"
      ? "accent-green"
      : healthStatus === "error"
        ? "accent-red"
        : "accent-muted";

  return (
    <div className="mx-auto max-w-7xl px-6 py-12" data-testid="dashboard-page">
      <header className="mb-10 animate-fade-up">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-muted">
          Medallion Pipeline
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Dashboard
        </h1>
        <p className="mt-3 max-w-xl text-base text-slate-muted">
          Monitor ingestion health, data quality, and promotion across the
          Bronze &rarr; Silver &rarr; Gold tiers.
        </p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Pipeline Health */}
        <div
          className={`card-accent ${healthAccent} card-hoverable animate-fade-up p-6`}
          style={{ animationDelay: "0.04s" }}
          data-testid="card-pipeline-health"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-ink">
              Pipeline Health
            </h2>
            <span
              className={`h-2 w-2 rounded-full ${
                healthStatus === "ok"
                  ? "bg-green-500 shadow-[0_0_0_3px_rgba(34,197,94,0.18)]"
                  : healthStatus === "error"
                    ? "bg-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.18)]"
                    : "bg-slate-muted"
              } ${healthStatus === "loading" ? "animate-pulse" : ""}`}
            />
          </div>

          {healthStatus === "loading" && (
            <p className="font-data text-sm text-slate-muted" data-testid="health-loading">
              checking&hellip;
            </p>
          )}
          {healthStatus === "ok" && (
            <div data-testid="health-ok">
              <p className="font-data text-2xl font-semibold text-green-600">
                operational
              </p>
              <p className="mt-1 font-data text-xs text-slate-muted">
                backend: ok
              </p>
            </div>
          )}
          {healthStatus === "error" && (
            <div data-testid="health-error">
              <p className="font-data text-2xl font-semibold text-red-600">
                unreachable
              </p>
              <p className="mt-1 font-data text-xs text-slate-muted">
                backend: offline
              </p>
            </div>
          )}
        </div>

        {/* Tier cards */}
        {tierCards.map((card, i) => (
          <div
            key={card.title}
            className={`card-accent ${card.accent} card-hoverable animate-fade-up p-6`}
            style={{ animationDelay: `${(i + 2) * 0.04}s` }}
            data-testid={`card-${card.title.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-ink">
                {card.title}
              </h2>
              <span
                className={`rounded-full px-2 py-0.5 font-data text-[10px] font-semibold tracking-wide ${card.labelClass}`}
              >
                {card.label}
              </span>
            </div>
            <p className="font-data text-2xl font-semibold text-slate-muted/70">
              &mdash;&mdash;
            </p>
            <p className="mt-1 text-xs text-slate-muted">{card.hint}</p>
          </div>
        ))}
      </div>

      <section className="mt-14">
        <h2 className="text-lg font-semibold text-ink">Getting started</h2>
        <div className="mt-5 card card-hoverable animate-fade-in overflow-hidden p-8">
          <div className="flex flex-col items-start gap-2">
            <p className="text-base text-ink">
              No datasets ingested yet.
            </p>
            <p className="max-w-md text-sm text-slate-muted">
              Upload a CSV or JSON file to the Bronze layer. Sentinel will
              validate it, auto-repair detected issues, and let you promote
              clean data up the medallion tiers.
            </p>
            <a
              href="/upload"
              data-testid="cta-upload"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-ink/90"
            >
              Upload to Bronze
              <span aria-hidden>&rarr;</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
