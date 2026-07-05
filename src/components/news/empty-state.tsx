"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, KeyRound, Newspaper, Sparkles, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type NewsEmptyVariant = "no-portfolio" | "no-key" | "no-news";

interface NewsEmptyStateProps {
  variant: NewsEmptyVariant;
  onOpenSettings?: () => void;
  className?: string;
}

const COPY: Record<
  NewsEmptyVariant,
  { pill: string; heading: string; sub: string; ctaLabel: string; icon: React.ComponentType<{ className?: string }> }
> = {
  "no-portfolio": {
    pill: "No portfolio yet",
    heading: "Add a portfolio to see news for your stocks.",
    sub: "News is filtered strictly to the companies you own — no market noise. Import your first portfolio to start.",
    ctaLabel: "Go to dashboard",
    icon: Wallet,
  },
  "no-key": {
    pill: "One-time setup",
    heading: "Add your Google Gemini key to unlock sentiment + Hinglish.",
    sub: "Gemini 1.5 Flash is free — 1500 requests/day, no card required. Your key stays on this device (localStorage) and is only sent to Google.",
    ctaLabel: "Open news settings",
    icon: KeyRound,
  },
  "no-news": {
    pill: "Nothing fresh",
    heading: "No news for your holdings in the last 30 days.",
    sub: "Either the market has been quiet for these stocks, or Google News hasn't indexed anything relevant. Try refreshing later or widen the timeframe.",
    ctaLabel: "Back to dashboard",
    icon: Newspaper,
  },
};

export function NewsEmptyState({ variant, onOpenSettings, className }: NewsEmptyStateProps) {
  const meta = COPY[variant];
  const Icon = meta.icon;
  const isKey = variant === "no-key";

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-br from-emerald-500/[0.08] via-teal-400/[0.03] to-transparent p-8 shadow-glass md:p-10",
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-emerald-500/[0.15] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-teal-400/[0.08] blur-3xl" />

      <div className="relative flex flex-col items-center gap-6 text-center md:flex-row md:items-start md:text-left">
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl border border-emerald-400/30 bg-emerald-500/[0.08] shadow-glow-emerald backdrop-blur-sm">
          <Icon className="h-10 w-10 text-emerald-200" />
          <div className="absolute -right-2 -top-2 inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-emerald-300/40 bg-emerald-400/[0.14]">
            <Sparkles className="h-4 w-4 text-emerald-200" />
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center gap-3 md:items-start">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-500/[0.08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-200">
            {meta.pill}
          </span>
          <h2 className="max-w-xl font-display text-2xl font-semibold leading-tight text-white md:text-3xl">
            {meta.heading}
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground md:text-[15px]">{meta.sub}</p>

          <div className="mt-3 flex flex-col items-stretch gap-2 md:flex-row md:items-center">
            {isKey ? (
              <Button size="lg" onClick={onOpenSettings} className="shadow-glow-emerald">
                <KeyRound className="h-4 w-4" /> {meta.ctaLabel}
              </Button>
            ) : (
              <Button asChild size="lg" className="shadow-glow-emerald">
                <Link href="/">
                  <ArrowLeft className="h-4 w-4" /> {meta.ctaLabel}
                </Link>
              </Button>
            )}
            {isKey && (
              <Link
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-emerald-400/40 hover:text-emerald-200"
              >
                Get a free key from Google AI Studio →
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
