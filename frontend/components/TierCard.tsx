import type { ReactNode } from "react";
import {
  TIER_BORDER_CLASS,
  TIER_CARD_BASE_CLASS,
  TierVariant,
} from "@/lib/styles";

type TierCardProps = {
  variant: TierVariant;
  className?: string;
  children: ReactNode;
};

export function TierCard({ variant, className = "", children }: TierCardProps) {
  return (
    <div
      className={`${TIER_CARD_BASE_CLASS} ${TIER_BORDER_CLASS[variant]} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
