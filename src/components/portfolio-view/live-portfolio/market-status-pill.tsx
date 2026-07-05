"use client";

import { motion } from "framer-motion";
import type { MarketStatus } from "@/lib/live-quotes/types";
import { marketStatusLabel } from "@/lib/live-quotes/market-hours";
import { cn } from "@/lib/utils";

interface MarketStatusPillProps {
  status: MarketStatus;
  className?: string;
}

const TONE: Record<MarketStatus, { dot: string; ring: string; text: string; border: string; bg: string }> = {
  open:         { dot: "bg-emerald-400", ring: "ring-emerald-400/60", text: "text-emerald-200", border: "border-emerald-400/40", bg: "bg-emerald-500/[0.08]" },
  "pre-open":   { dot: "bg-amber-300",   ring: "ring-amber-300/50",   text: "text-amber-100",  border: "border-amber-300/40",  bg: "bg-amber-500/[0.08]" },
  "post-close": { dot: "bg-cyan-300",    ring: "ring-cyan-300/50",    text: "text-cyan-100",   border: "border-cyan-300/40",   bg: "bg-cyan-500/[0.08]" },
  closed:       { dot: "bg-slate-400",   ring: "ring-slate-400/40",   text: "text-slate-200",  border: "border-white/[0.08]",  bg: "bg-white/[0.03]" },
};

export function MarketStatusPill({ status, className }: MarketStatusPillProps) {
  const tone = TONE[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
        tone.border,
        tone.bg,
        tone.text,
        className,
      )}
    >
      <span className="relative inline-flex h-2 w-2">
        {status === "open" && (
          <motion.span
            className={cn("absolute inline-flex h-full w-full rounded-full", tone.dot, "opacity-70")}
            animate={{ scale: [1, 2.2, 1], opacity: [0.7, 0, 0.7] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
            aria-hidden
          />
        )}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full ring-2", tone.dot, tone.ring)} />
      </span>
      {marketStatusLabel(status)}
    </span>
  );
}
