"use client";

import * as React from "react";
import { CheckCircle2, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RebalanceStatus } from "@/types/target-portfolio";

const META: Record<
  RebalanceStatus,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  "on-target": {
    label: "On target",
    className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    icon: CheckCircle2,
  },
  "under-allocated": {
    label: "Under allocated",
    className: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    icon: TrendingUp,
  },
  "over-allocated": {
    label: "Over allocated",
    className: "border-red-400/30 bg-red-500/10 text-red-200",
    icon: TrendingDown,
  },
};

export function StatusBadge({
  status,
  className,
  showLabel = true,
}: {
  status: RebalanceStatus;
  className?: string;
  showLabel?: boolean;
}) {
  const meta = META[status];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        meta.className,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {showLabel ? meta.label : null}
    </span>
  );
}

export function getStatusLabel(status: RebalanceStatus): string {
  return META[status].label;
}
