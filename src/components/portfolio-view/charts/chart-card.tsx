"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function ChartCard({ title, subtitle, right, children, className }: ChartCardProps) {
  return (
    <div className={cn("glass relative overflow-hidden p-5", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl"
      />
      <div className="relative mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="font-display text-base font-semibold">{title}</div>
          {subtitle && (
            <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>
          )}
        </div>
        {right}
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

export function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[240px] w-full items-center justify-center rounded-xl border border-dashed border-white/[0.08] text-xs text-muted-foreground">
      {message}
    </div>
  );
}
