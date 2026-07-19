"use client";

import { LineageStage } from "@/lib/api";
import { FONT_DATA_CLASS } from "@/lib/styles";

type LineageStepKey = "bronze" | "repaired" | "silver" | "gold";

const STEP_LABELS: Record<LineageStepKey, string> = {
  bronze: "Bronze",
  repaired: "Repaired",
  silver: "Silver",
  gold: "Gold",
};

const STEP_WIDTH: Record<LineageStepKey, string> = {
  bronze: "w-full",
  repaired: "w-[94%]",
  silver: "w-[88%]",
  gold: "w-[82%]",
};

const COMPLETE_STYLES: Record<LineageStepKey, string> = {
  bronze: "border-l-bronze bg-bronze/10 text-bronze",
  repaired: "border-l-bronze bg-bronze/10 text-bronze",
  silver: "border-l-silver bg-silver/15 text-gray-700",
  gold: "border-l-gold bg-gold/10 text-gold",
};

const PENDING_STYLE =
  "border-l-slate-muted bg-gray-50/80 text-slate-muted opacity-60";

function formatTimestamp(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString();
}

function CheckIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-green-600"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

type LineageDiagramProps = {
  stages: LineageStage[];
};

export function LineageDiagram({ stages }: LineageDiagramProps) {
  const stageMap = new Map(stages.map((stage) => [stage.stage, stage]));
  const showRepaired = stageMap.has("repaired");

  const stepKeys: LineageStepKey[] = showRepaired
    ? ["bronze", "repaired", "silver", "gold"]
    : ["bronze", "silver", "gold"];

  return (
    <div className="flex flex-col items-center gap-3 py-1">
      {stepKeys.map((key) => {
        const stage = stageMap.get(key);
        const isComplete = Boolean(stage?.timestamp || stage?.path);

        return (
          <div
            key={key}
            className={`rounded-xl border-l-4 shadow-sm transition-all ${STEP_WIDTH[key]} ${isComplete ? COMPLETE_STYLES[key] : PENDING_STYLE}`}
          >
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <span className="text-sm font-semibold">{STEP_LABELS[key]}</span>

              {isComplete && stage?.timestamp ? (
                <div className="flex items-center gap-2 text-xs">
                  <CheckIcon />
                  <time className={`${FONT_DATA_CLASS} opacity-90`}>
                    {formatTimestamp(stage.timestamp)}
                  </time>
                </div>
              ) : (
                <span className="text-xs italic">Not yet promoted</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
