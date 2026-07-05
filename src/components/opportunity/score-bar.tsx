"use client";

import { cn } from "@/lib/utils";

/**
 * 0-100 gradient score bar with band-based fill color.
 * Bands: 0-35 red / 35-50 amber / 50-70 lime / 70-85 emerald / 85-100 violet.
 * Used inside OpportunityCard (mini bars for 6 sub-scores) and OpportunityDrawer (full bars).
 */

interface ScoreBarProps {
  score: number;
  label?: string;
  size?: "sm" | "md";
  className?: string;
  showValue?: boolean;
}

function scoreBand(score: number): { from: string; to: string; text: string } {
  if (score >= 85) return { from: "from-violet-400", to: "to-violet-300", text: "text-violet-200" };
  if (score >= 70) return { from: "from-emerald-400", to: "to-emerald-300", text: "text-emerald-200" };
  if (score >= 50) return { from: "from-lime-400", to: "to-lime-300", text: "text-lime-200" };
  if (score >= 35) return { from: "from-amber-400", to: "to-amber-300", text: "text-amber-200" };
  return { from: "from-red-500", to: "to-red-400", text: "text-red-200" };
}

export function ScoreBar({ score, label, size = "md", className, showValue = true }: ScoreBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const band = scoreBand(clamped);
  const heightClass = size === "sm" ? "h-1" : "h-1.5";
  const labelClass = size === "sm" ? "text-[10px]" : "text-[11px]";

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {(label || showValue) && (
        <div className={cn("flex items-center justify-between gap-2 uppercase tracking-wider", labelClass)}>
          {label && <span className="text-muted-foreground">{label}</span>}
          {showValue && <span className={cn("money-tabular font-semibold", band.text)}>{clamped}</span>}
        </div>
      )}
      <div className={cn("w-full rounded-full bg-white/[0.04] border border-white/[0.03] overflow-hidden", heightClass)}>
        <div
          className={cn("h-full rounded-full bg-gradient-to-r", band.from, band.to)}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
