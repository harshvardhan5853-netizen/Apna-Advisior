"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0..1
  indeterminate?: boolean;
}

export function Progress({
  value,
  indeterminate,
  className,
  ...props
}: ProgressProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : Math.round(pct)}
      className={cn(
        "relative h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]",
        className,
      )}
      {...props}
    >
      {indeterminate ? (
        <div className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-shimmer" />
      ) : (
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      )}
    </div>
  );
}
