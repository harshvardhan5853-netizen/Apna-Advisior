"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NewsSentiment } from "@/types/news";

interface SentimentPillProps {
  sentiment: NewsSentiment;
  confidence?: number; // 0..1
  size?: "sm" | "md";
  className?: string;
  showConfidence?: boolean;
}

const SENTIMENT_META: Record<
  NewsSentiment,
  { label: string; short: string; tone: "gain" | "loss" | "muted"; strength: "strong" | "mild" | "flat"; icon: React.ComponentType<{ className?: string }>; ringClass: string; textClass: string }
> = {
  "very-positive": {
    label: "Very positive",
    short: "V+",
    tone: "gain",
    strength: "strong",
    icon: TrendingUp,
    ringClass: "border-emerald-400/50 bg-emerald-500/[0.12]",
    textClass: "text-emerald-200",
  },
  positive: {
    label: "Positive",
    short: "+",
    tone: "gain",
    strength: "mild",
    icon: ArrowUp,
    ringClass: "border-emerald-400/30 bg-emerald-500/[0.06]",
    textClass: "text-emerald-300",
  },
  neutral: {
    label: "Neutral",
    short: "•",
    tone: "muted",
    strength: "flat",
    icon: Minus,
    ringClass: "border-white/10 bg-white/[0.04]",
    textClass: "text-muted-foreground",
  },
  negative: {
    label: "Negative",
    short: "−",
    tone: "loss",
    strength: "mild",
    icon: ArrowDown,
    ringClass: "border-red-400/30 bg-red-500/[0.06]",
    textClass: "text-red-300",
  },
  "very-negative": {
    label: "Very negative",
    short: "V−",
    tone: "loss",
    strength: "strong",
    icon: TrendingDown,
    ringClass: "border-red-400/50 bg-red-500/[0.12]",
    textClass: "text-red-200",
  },
};

function SentimentPillBase({ sentiment, confidence, size = "md", className, showConfidence = true }: SentimentPillProps) {
  const meta = SENTIMENT_META[sentiment];
  const Icon = meta.icon;
  const pct = Math.round(Math.max(0, Math.min(1, confidence ?? 0)) * 100);
  const isSm = size === "sm";
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        meta.ringClass,
        meta.textClass,
        isSm ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        className,
      )}
    >
      <Icon className={cn(isSm ? "h-3 w-3" : "h-3.5 w-3.5")} />
      <span>{meta.label}</span>
      {showConfidence && typeof confidence === "number" && confidence > 0 && (
        <span className={cn("ml-1 rounded-full px-1.5 py-px text-[10px] font-semibold", "bg-white/[0.05] text-muted-foreground", isSm && "text-[9px]")}>{pct}%</span>
      )}
    </motion.span>
  );
}

export const SentimentPill = React.memo(SentimentPillBase);

/** Compact confidence bar — useful in the article card footer next to the pill. */
export function ConfidenceBar({ confidence, className }: { confidence: number; className?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, confidence)) * 100);
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <div className="relative h-1 w-24 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.span
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-400 to-teal-300"
        />
      </div>
      <span className="text-[10px] font-medium text-muted-foreground">{pct}%</span>
    </div>
  );
}

export function getSentimentLabel(sentiment: NewsSentiment): string {
  return SENTIMENT_META[sentiment].label;
}
