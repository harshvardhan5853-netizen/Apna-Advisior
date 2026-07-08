"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Building2, CheckCircle2, Clock, Newspaper, RefreshCw, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NewsSummary } from "@/types/news";

interface SummaryHeaderProps {
  summary: NewsSummary;
  onRefresh: () => void;
  refreshing: boolean;
  className?: string;
}

function formatClock(ts: number | null): string {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

function formatRelative(ts: number | null): string {
  if (!ts) return "no data";
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return `${Math.round(diff / 86_400_000)}d ago`;
}

function SummaryHeaderBase({ summary, onRefresh, refreshing, className }: SummaryHeaderProps) {
  // Percent tiles must divide by analyzed count, not total: on free-tier Gemini
  // most articles stay "Awaiting analysis" and dividing by totalArticles makes
  // real signal look like 0-4% and users think classification is broken.
  const { positive, negative, neutral, analyzed, articlesSub } = React.useMemo(() => {
    const p = (summary.bySentiment["very-positive"] ?? 0) + (summary.bySentiment.positive ?? 0);
    const n = (summary.bySentiment["very-negative"] ?? 0) + (summary.bySentiment.negative ?? 0);
    const z = summary.bySentiment.neutral ?? 0;
    const a = p + n + z;
    return {
      positive: p,
      negative: n,
      neutral: z,
      analyzed: a,
      articlesSub: a < summary.totalArticles ? `${a} analyzed` : undefined,
    };
  }, [summary.bySentiment, summary.totalArticles]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn("grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6", className)}
    >
      <Tile label="Articles" icon={Newspaper} tone="muted" value={String(summary.totalArticles)} sub={articlesSub} />
      <Tile label="Positive" icon={CheckCircle2} tone="gain" value={String(positive)} sub={`${percent(positive, analyzed)}`} />
      <Tile label="Negative" icon={XCircle} tone="loss" value={String(negative)} sub={`${percent(negative, analyzed)}`} />
      <Tile label="Neutral" icon={AlertTriangle} tone="muted" value={String(neutral)} sub={`${percent(neutral, analyzed)}`} />
      <Tile
        label="Most covered"
        icon={Building2}
        tone="muted"
        value={summary.mostCoveredStock?.symbol ?? "—"}
        sub={summary.mostCoveredStock ? `${summary.mostCoveredStock.count} articles` : "no data"}
      />
      <Tile
        label="Last updated"
        icon={Clock}
        tone="muted"
        value={formatClock(summary.lastUpdated)}
        sub={`Latest headline ${formatRelative(summary.latestAt)}`}
        action={
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-muted-foreground transition-colors",
              "hover:border-emerald-400/40 hover:text-emerald-200 disabled:opacity-50",
            )}
            aria-label="Refresh news"
            title="Refresh"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          </button>
        }
      />
    </motion.section>
  );
}

function percent(n: number, total: number): string {
  if (total <= 0) return "—";
  return `${Math.round((n / total) * 100)}%`;
}

interface TileProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "gain" | "loss" | "muted";
  action?: React.ReactNode;
}

// Memoized: 6 Tile instances render on every SummaryHeader render. Without this,
// every quote tick or news refresh re-renders all 6 tiles even when their props
// are unchanged.
const Tile = React.memo(TileBase);

function TileBase({ label, value, sub, icon: Icon, tone, action }: TileProps) {
  const toneClass =
    tone === "gain" ? "text-emerald-300" : tone === "loss" ? "text-red-300" : "text-white/85";
  const iconTone =
    tone === "gain"
      ? "text-emerald-300 border-emerald-400/25 bg-emerald-500/[0.08]"
      : tone === "loss"
      ? "text-red-300 border-red-400/25 bg-red-500/[0.06]"
      : "text-emerald-200/70 border-white/[0.08] bg-white/[0.03]";
  return (
    <div className="glass relative overflow-hidden p-3">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-400/[0.05] blur-2xl" />
      <div className="relative flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
          <span className={cn("money-tabular font-display text-xl font-semibold", toneClass)}>{value}</span>
          {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
        </div>
        <div className={cn("inline-flex h-8 w-8 items-center justify-center rounded-lg border", iconTone)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {action && <div className="relative mt-2">{action}</div>}
    </div>
  );
}

// Memoized: news-view re-renders on every filter/sort/quote change and
// summary shape only changes when articles change. Preventing re-render here
// stops 6 tiles + inner icons from rebuilding on unrelated updates.
export const SummaryHeader = React.memo(SummaryHeaderBase);

/** Compute a NewsSummary from a list of analyzed articles. Pure fn — usable server-side too. */
export function summarize(articles: import("@/types/news").AnalyzedNewsArticle[], lastUpdated: number): NewsSummary {
  const bySentiment: NewsSummary["bySentiment"] = {
    "very-positive": 0,
    positive: 0,
    neutral: 0,
    negative: 0,
    "very-negative": 0,
  };
  const byCategory: NewsSummary["byCategory"] = {};
  const byStock: Record<string, number> = {};
  let latestAt: number | null = null;

  for (const a of articles) {
    if (a.publishedAt && (!latestAt || a.publishedAt > latestAt)) latestAt = a.publishedAt;
    const symbols = a.analysis?.affectedSymbols ?? a.matchedSymbols;
    for (const s of symbols) {
      byStock[s] = (byStock[s] ?? 0) + 1;
    }
    if (a.analysis) {
      bySentiment[a.analysis.sentiment] = (bySentiment[a.analysis.sentiment] ?? 0) + 1;
      byCategory[a.analysis.category] = (byCategory[a.analysis.category] ?? 0) + 1;
    }
  }

  let mostCoveredStock: NewsSummary["mostCoveredStock"] = null;
  for (const [symbol, count] of Object.entries(byStock)) {
    if (!mostCoveredStock || count > mostCoveredStock.count) {
      mostCoveredStock = { symbol, count };
    }
  }

  return {
    totalArticles: articles.length,
    byStock,
    bySentiment,
    byCategory,
    mostCoveredStock,
    latestAt,
    lastUpdated,
  };
}
