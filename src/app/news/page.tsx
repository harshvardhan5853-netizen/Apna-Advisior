"use client";

import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { NewsView } from "@/components/news/news-view";

export default function NewsRoute() {
  return (
    <div className="relative min-h-screen">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.15]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(16,185,129,0.12) 0 1px, transparent 1px 56px), repeating-linear-gradient(90deg, rgba(16,185,129,0.12) 0 1px, transparent 1px 56px)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -top-32 left-1/2 -z-10 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-emerald-500/[0.08] blur-3xl"
      />

      <main className="container relative mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 md:py-14">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-emerald-400/40 hover:text-emerald-200"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to dashboard
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/[0.08] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-emerald-200">
              <Sparkles className="h-3 w-3" />
              News
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="font-display text-3xl font-semibold leading-tight md:text-4xl">
              Portfolio <span className="text-emerald-gradient">news intelligence</span>
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
              Curated news for your holdings only · Google News + Gemini Hinglish analysis · auto-refresh every 20 min.
            </p>
          </div>
        </header>

        <NewsView />

        <footer className="mt-4 border-t border-white/[0.05] pt-4 text-center text-[11px] text-muted-foreground">
          Not investment advice. News summaries are model-generated and may contain errors — verify before acting.
        </footer>
      </main>
    </div>
  );
}
