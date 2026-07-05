"use client";

import { ArrowDownRight, ArrowUpRight, Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Recommendation } from "@/types/opportunity";

type Size = "sm" | "md";

interface RecommendationBadgeProps {
  recommendation: Recommendation;
  size?: Size;
  className?: string;
}

const META: Record<
  Recommendation,
  { label: string; icon: LucideIcon; className: string }
> = {
  "strong-buy": {
    label: "Strong Buy",
    icon: TrendingUp,
    className:
      "border-emerald-300/40 bg-emerald-400/95 text-emerald-950 shadow-glow-emerald",
  },
  buy: {
    label: "Buy",
    icon: ArrowUpRight,
    className:
      "border-emerald-400/30 bg-emerald-500/[0.15] text-emerald-200",
  },
  hold: {
    label: "Hold",
    icon: Minus,
    className: "border-amber-400/30 bg-amber-500/[0.12] text-amber-200",
  },
  sell: {
    label: "Sell",
    icon: ArrowDownRight,
    className: "border-red-400/30 bg-red-500/[0.12] text-red-200",
  },
  "strong-sell": {
    label: "Strong Sell",
    icon: TrendingDown,
    className:
      "border-red-400/40 bg-red-500/95 text-red-50 shadow-[0_0_18px_-6px_rgba(239,68,68,0.55)]",
  },
};

const SIZE_MAP: Record<Size, { padding: string; text: string; icon: string }> = {
  sm: { padding: "px-2 py-0.5", text: "text-[10px]", icon: "h-3 w-3" },
  md: { padding: "px-2.5 py-1", text: "text-xs", icon: "h-3.5 w-3.5" },
};

export function RecommendationBadge({
  recommendation,
  size = "md",
  className,
}: RecommendationBadgeProps) {
  const meta = META[recommendation];
  const sizing = SIZE_MAP[size];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-semibold uppercase tracking-wider",
        sizing.padding,
        sizing.text,
        meta.className,
        className,
      )}
    >
      <Icon className={sizing.icon} />
      {meta.label}
    </span>
  );
}

export function getRecommendationLabel(rec: Recommendation): string {
  return META[rec].label;
}
