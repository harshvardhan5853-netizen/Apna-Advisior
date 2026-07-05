"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Building2,
  Calendar,
  ExternalLink,
  FileText,
  Flame,
  Info,
  Newspaper,
  Sparkles,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SentimentPill } from "./sentiment-pill";
import type { AnalyzedNewsArticle, NewsCategory, NewsSource } from "@/types/news";

interface NewsCardProps {
  article: AnalyzedNewsArticle;
  index?: number;
  className?: string;
}

const SOURCE_LABEL: Record<NewsSource, string> = {
  "google-news": "Google News",
  "nse-filing": "NSE filing",
  "bse-filing": "BSE filing",
  "business-standard": "Business Standard",
  "economic-times": "Economic Times",
  moneycontrol: "Moneycontrol",
  livemint: "Livemint",
  reuters: "Reuters",
  yahoo: "Yahoo Finance",
  other: "News",
};

const CATEGORY_LABEL: Record<NewsCategory, string> = {
  earnings: "Earnings",
  "order-win": "Order win",
  "management-change": "Management change",
  regulatory: "Regulatory",
  dividend: "Dividend",
  buyback: "Buyback",
  split: "Split",
  "bonus-issue": "Bonus issue",
  "merger-acquisition": "M&A",
  "product-launch": "Product launch",
  expansion: "Expansion",
  guidance: "Guidance",
  legal: "Legal",
  "credit-rating": "Credit rating",
  "analyst-action": "Analyst action",
  "insider-activity": "Insider activity",
  "macro-impact": "Macro impact",
  other: "News",
};

const HORIZON_LABEL: Record<string, string> = {
  immediate: "Immediate impact",
  "short-term": "Short term",
  "medium-term": "Medium term",
  "long-term": "Long term",
  uncertain: "Uncertain horizon",
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  if (diff < 30 * 86_400_000) return `${Math.round(diff / 86_400_000)}d ago`;
  return new Date(ts).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function stripHtml(s: string | null): string {
  if (!s) return "";
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

// Hoisted to module scope so framer-motion sees the SAME object reference
// across renders and skips re-evaluating hover state per card.
const HOVER_ANIM = { y: -2 };
const INITIAL_ANIM = { opacity: 0, y: 10 };
const ANIMATE_ANIM = { opacity: 1, y: 0 };

export function isBreakingNews(article: AnalyzedNewsArticle): boolean {
  const a = article.analysis;
  if (!a) return false;
  const recent = Date.now() - article.publishedAt < SIX_HOURS_MS;
  const highImpact = a.importance >= 75;
  const strongSentiment = a.sentiment === "very-positive" || a.sentiment === "very-negative";
  return (recent && highImpact) || (highImpact && strongSentiment && a.importance >= 70);
}

function NewsCardBase({ article, index = 0, className }: NewsCardProps) {
  const analysis = article.analysis;
  const snippet = React.useMemo(() => stripHtml(article.snippet).slice(0, 240), [article.snippet]);
  const publisher = article.publisher || SOURCE_LABEL[article.source];
  const affected = analysis?.affectedSymbols ?? article.matchedSymbols;
  const breaking = React.useMemo(() => isBreakingNews(article), [article]);

  return (
    <motion.article
      initial={INITIAL_ANIM}
      animate={ANIMATE_ANIM}
      transition={{ duration: 0.35, delay: Math.min(0.2, index * 0.02) }}
      whileHover={HOVER_ANIM}
      className={cn(
        "group relative flex flex-col gap-3 overflow-hidden rounded-2xl border p-4 backdrop-blur-md transition-colors",
        breaking
          ? "border-rose-400/30 bg-rose-500/[0.04] hover:border-rose-400/50 hover:bg-rose-500/[0.06]"
          : "border-white/[0.06] bg-white/[0.02] hover:border-emerald-400/25 hover:bg-white/[0.03]",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full blur-3xl",
          breaking ? "bg-rose-400/[0.08]" : "bg-emerald-400/[0.06]",
        )}
      />

      <div className="relative flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/[0.06] bg-white/[0.03]">
            {article.source === "nse-filing" || article.source === "bse-filing" ? (
              <FileText className="h-3 w-3 text-emerald-300" />
            ) : (
              <Newspaper className="h-3 w-3 text-emerald-300" />
            )}
          </span>
          <span className="truncate font-medium text-white/70">{publisher}</span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {timeAgo(article.publishedAt)}
          </span>
          {breaking && (
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/40 bg-rose-500/[0.12] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-100">
              <Zap className="h-2.5 w-2.5" /> Breaking
            </span>
          )}
        </div>
        <Link
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-muted-foreground transition-colors hover:border-emerald-400/40 hover:text-emerald-300"
          aria-label="Open article"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* affected stocks */}
      {affected.length > 0 && (
        <div className="relative flex flex-wrap items-center gap-1">
          {affected.slice(0, 5).map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-500/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-200"
            >
              <Building2 className="h-2.5 w-2.5" /> {s}
            </span>
          ))}
          {affected.length > 5 && (
            <span className="text-[10px] text-muted-foreground">+{affected.length - 5}</span>
          )}
        </div>
      )}

      {/* headline */}
      <h3 className="relative line-clamp-3 font-display text-[15px] font-semibold leading-snug text-white">
        {article.title}
      </h3>

      {/* snippet (fallback when no LLM analysis yet) */}
      {snippet && !analysis?.hinglishExplanation && (
        <p className="relative line-clamp-3 text-[13px] text-muted-foreground">{snippet}</p>
      )}

      {/* Hinglish explanation — the star of the card */}
      {analysis?.hinglishExplanation && (
        <div className="relative rounded-xl border border-emerald-400/15 bg-emerald-500/[0.04] p-3">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300/90">
            <Sparkles className="h-3 w-3" /> Aapke liye
          </div>
          <p className="text-[13px] leading-relaxed text-white/85">{analysis.hinglishExplanation}</p>
        </div>
      )}

      {/* why it matters */}
      {analysis?.whyItMatters && (
        <div className="relative flex items-start gap-2 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 text-[12px] text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300/80" />
          <div>
            <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-300/80">Why it matters</div>
            <p className="leading-relaxed text-white/70">{analysis.whyItMatters}</p>
          </div>
        </div>
      )}

      {/* footer row: sentiment + category + horizon */}
      <div className="relative mt-auto flex flex-wrap items-center gap-2 pt-1">
        {analysis && (
          <SentimentPill sentiment={analysis.sentiment} confidence={analysis.confidence} size="sm" />
        )}
        {analysis?.category && (
          <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-white/70">
            {CATEGORY_LABEL[analysis.category]}
          </span>
        )}
        {analysis?.impactHorizon && (
          <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-white/60">
            {HORIZON_LABEL[analysis.impactHorizon] ?? analysis.impactHorizon}
          </span>
        )}
        {analysis && analysis.importance >= 60 && !breaking && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
              analysis.importance >= 80
                ? "border-amber-400/40 bg-amber-500/[0.10] text-amber-100"
                : "border-white/[0.10] bg-white/[0.04] text-white/70",
            )}
            title={`Importance score ${analysis.importance}/100`}
          >
            <Flame className="h-3 w-3" /> Importance {analysis.importance}
          </span>
        )}
        {!analysis && !article.analysisFailed && (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-500/[0.06] px-2 py-0.5 text-[10px] font-medium text-amber-200">
            <Sparkles className="h-3 w-3" /> Awaiting analysis
          </span>
        )}
        {article.analysisFailed && (
          <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.02] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Analysis unavailable
          </span>
        )}
      </div>
    </motion.article>
  );
}

// Memoized: news feed can render 100+ cards. Without React.memo, a single quote
// tick or filter change re-renders every card even when its own article prop is
// unchanged. Memoization here cuts news-page render cost dramatically.
export const NewsCard = React.memo(NewsCardBase);
