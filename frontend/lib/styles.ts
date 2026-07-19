/** Apply to IDs, counts, scores, timestamps, paths, and status values. */
export const FONT_DATA_CLASS = "font-data";

export type TierVariant = "bronze" | "silver" | "gold" | "slate-muted";

export type DatasetVersionStatusLike =
  | "uploaded"
  | "validating"
  | "validated"
  | "repairing"
  | "repaired"
  | "promoted"
  | "promoted_silver"
  | "promoted_gold"
  | "failed"
  | null;

export const TIER_BORDER_CLASS: Record<TierVariant, string> = {
  bronze: "border-l-bronze",
  silver: "border-l-silver",
  gold: "border-l-gold",
  "slate-muted": "border-l-slate-muted",
};

export const TIER_CARD_BASE_CLASS =
  "bg-white rounded-xl shadow-sm border-l-4";

export function statusToTierVariant(
  status: DatasetVersionStatusLike,
): TierVariant {
  if (!status) return "slate-muted";

  switch (status) {
    case "promoted_gold":
      return "gold";
    case "promoted_silver":
    case "promoted":
      return "silver";
    case "failed":
    case "uploaded":
    case "validating":
    case "repairing":
      return "slate-muted";
    default:
      return "bronze";
  }
}

export function qualityScoreClass(score: number | null): string {
  if (score === null) return "text-gray-400";
  if (score >= 80) return "text-green-600";
  if (score >= 50) return "text-yellow-600";
  return "text-red-600";
}
