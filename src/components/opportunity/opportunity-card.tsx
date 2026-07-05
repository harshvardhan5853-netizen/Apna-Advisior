"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, ShieldAlert, Sparkles } from "lucide-react";
import type { OpportunityAnalysis, RiskLevel } from "@/types/opportunity";
import { cn, formatINR, formatPct } from "@/lib/utils";
import { RecommendationBadge } from "./recommendation-badge";
import { ValuationPill } from "./valuation-pill";
import { ScoreBar } from "./score-bar";

interface OpportunityCardProps {
  analysis: OpportunityAnalysis;
  onOpenDrawer?: (analysis: OpportunityAnalysis) => void;
  className?: string;
}

const RISK_META: Record<RiskLevel, { label: string; classes: string }> = {
  low: { label: "Low risk", classes: "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200" },
  medium: { label: "Medium risk", classes: "border-amber-400/30 bg-amber-500/[0.10] text-amber-200" },
  high: { label: "High risk", classes: "border-red-400/30 bg-red-500/[0.10] text-red-200" },
  "very-high": { label: "Very high risk", classes: "border-red-500/60 bg-red-500/[0.16] text-red-100" },
};

const TAG_LABEL: Record<string, string> = {
  cheap: "Cheap",
  growth: "Growth",
  dividend: "Dividend",
  "high-quality": "High quality",
  turnaround: "Turnaround",
};

function OpportunityCardBase({ analysis, onOpenDrawer, className }: OpportunityCardProps) {
  const [open, setOpen] = React.useState(false);
  const {
    name,
    symbol,
    sector,
    currentPrice,
    valuation,
    advisorScore,
    recommendation,
    confidence,
    scores,
    reasons,
    hinglish,
    risk,
    tags,
  } = analysis;

  const fairValue = valuation.fairValue;
  const gapPct = valuation.discountPercent;
  const risking = RISK_META[risk.level] ?? RISK_META.medium;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className={cn(
        "glass flex flex-col gap-3 rounded-2xl border border-white/[0.06] p-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-display text-base font-semibold">{name}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
            <span className="font-mono uppercase">{symbol}</span>
            {sector && (
              <>
                <span>·</span>
                <span className="truncate">{sector}</span>
              </>
            )}
          </div>
        </div>
        <ValuationPill status={valuation.status} discountPercent={gapPct} />
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
        <Stat label="Price" value={currentPrice != null ? formatINR(currentPrice, true) : "—"} />
        <Stat label="Fair value" value={fairValue != null ? formatINR(fairValue) : "—"} />
        <Stat
          label="Gap"
          value={gapPct != null ? formatPct(gapPct) : "—"}
          tone={gapPct != null ? (gapPct > 0 ? "gain" : gapPct < 0 ? "loss" : "muted") : "muted"}
        />
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">APNA score</div>
          <div className="mt-0.5 font-display text-2xl font-semibold money-tabular text-emerald-gradient">
            {Math.round(advisorScore)}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <RecommendationBadge recommendation={recommendation} size="md" />
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Confidence <span className="text-foreground">{(confidence * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <ScoreBar label="Value" score={scores.value} size="sm" />
        <ScoreBar label="Quality" score={scores.quality} size="sm" />
        <ScoreBar label="Growth" score={scores.growth} size="sm" />
        <ScoreBar label="Momentum" score={scores.momentum} size="sm" />
        <ScoreBar label="Health" score={scores.health} size="sm" />
        <ScoreBar label="News" score={scores.news} size="sm" />
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-emerald-400/30 hover:text-emerald-200"
      >
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
          Why this recommendation
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/[0.05] p-3 text-xs">
          {reasons.length > 0 ? (
            <ul className="ml-4 list-disc space-y-1">
              {reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          ) : (
            <div className="text-muted-foreground">No specific reasons available.</div>
          )}
          {hinglish && (
            <div className="mt-2 border-t border-emerald-400/20 pt-2 italic text-emerald-200/90">
              {hinglish}
            </div>
          )}
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-white/[0.05] pt-3">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            risking.classes,
          )}
        >
          <ShieldAlert className="h-3 w-3" />
          {risking.label}
        </span>
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center rounded-full border border-violet-400/30 bg-violet-500/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-200"
          >
            {TAG_LABEL[t] ?? t}
          </span>
        ))}
        <div className="ml-auto">
          {onOpenDrawer && (
            <button
              type="button"
              onClick={() => onOpenDrawer(analysis)}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:border-emerald-400/40 hover:text-emerald-200"
            >
              View details
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export const OpportunityCard = React.memo(OpportunityCardBase);

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "gain" | "loss" | "muted";
}) {
  const toneClass =
    tone === "gain"
      ? "text-emerald-300"
      : tone === "loss"
        ? "text-red-300"
        : tone === "muted"
          ? "text-muted-foreground"
          : "";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-sm font-semibold money-tabular", toneClass)}>{value}</div>
    </div>
  );
}
