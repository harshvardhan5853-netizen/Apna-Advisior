"use client";

import { CheckCircle2, AlertTriangle, IndianRupee, Layers } from "lucide-react";
import type { ImportStats } from "@/types/portfolio";
import { formatCompactINR } from "@/lib/utils";

export function ImportStatsRow({ stats }: { stats: ImportStats }) {
  const items = [
    {
      label: "Detected",
      value: stats.totalDetected.toString(),
      icon: Layers,
      tone: "text-emerald-200",
    },
    {
      label: "Ready",
      value: stats.successfullyImported.toString(),
      icon: CheckCircle2,
      tone: "text-emerald-300",
    },
    {
      label: "Needs review",
      value: stats.requiresReview.toString(),
      icon: AlertTriangle,
      tone: stats.requiresReview > 0 ? "text-amber-300" : "text-muted-foreground",
    },
    {
      label: "Invested",
      value: formatCompactINR(stats.totalInvested),
      icon: IndianRupee,
      tone: "text-foreground",
    },
    {
      label: "Current value",
      value: formatCompactINR(stats.estimatedCurrentValue),
      icon: IndianRupee,
      tone: "text-foreground",
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <div
            key={it.label}
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
          >
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              <Icon className={"h-3.5 w-3.5 " + it.tone} />
              {it.label}
            </div>
            <div className={"mt-1 font-display text-base font-semibold money-tabular " + it.tone}>
              {it.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
