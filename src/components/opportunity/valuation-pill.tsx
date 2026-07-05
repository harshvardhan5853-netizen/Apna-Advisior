"use client";

import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { ValuationStatus } from "@/types/opportunity";
import { cn } from "@/lib/utils";

const META: Record<
  ValuationStatus,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  undervalued: {
    label: "Undervalued",
    className: "border-emerald-400/40 bg-emerald-500/[0.12] text-emerald-200",
    icon: TrendingDown,
  },
  fair: {
    label: "Fairly valued",
    className: "border-white/15 bg-white/[0.04] text-muted-foreground",
    icon: Minus,
  },
  overvalued: {
    label: "Overvalued",
    className: "border-red-400/40 bg-red-500/[0.12] text-red-200",
    icon: TrendingUp,
  },
};

interface ValuationPillProps {
  status: ValuationStatus;
  discountPercent?: number | null;
  className?: string;
}

export function ValuationPill({ status, discountPercent, className }: ValuationPillProps) {
  const meta = META[status];
  const Icon = meta.icon;

  const tail =
    discountPercent != null && Number.isFinite(discountPercent) && Math.abs(discountPercent) >= 0.005
      ? status === "undervalued"
        ? ` • ${Math.round(Math.abs(discountPercent) * 100)}% below FV`
        : status === "overvalued"
          ? ` • ${Math.round(Math.abs(discountPercent) * 100)}% above FV`
          : ""
      : "";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider",
        meta.className,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
      {tail}
    </span>
  );
}

export function getValuationLabel(status: ValuationStatus): string {
  return META[status].label;
}
