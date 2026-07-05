"use client";

import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { OpportunityView } from "@/components/opportunity/opportunity-view";

export default function OpportunitiesRoute() {
  return (
    <div className="relative min-h-screen">
      <div
        className="pointer-events-none fixed inset-0 -z-20 opacity-[0.15]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(16,185,129,0.12) 0 1px, transparent 1px 56px), repeating-linear-gradient(90deg, rgba(16,185,129,0.12) 0 1px, transparent 1px 56px)",
        }}
      />
      <div className="pointer-events-none fixed -top-32 left-1/2 -z-10 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-emerald-500/[0.08] blur-3xl" />

      <main className="container relative mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 md:py-14">
        <header className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:border-emerald-400/40 hover:text-emerald-300"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to dashboard
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-violet-200">
              <Sparkles className="h-3 w-3" />
              Opportunity Finder
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-3xl font-semibold leading-tight md:text-4xl">
              Market <span className="text-emerald-gradient">opportunities</span>
            </h1>
            <p className="text-sm text-muted-foreground md:text-base">
              Fundamentals, technicals, valuation, and scored Buy/Sell recommendations across your portfolio and the broader NSE universe — never auto-traded.
            </p>
          </div>
        </header>

        <OpportunityView />

        <footer className="mt-6 border-t border-white/[0.06] pt-4 text-center text-[11px] text-muted-foreground">
          Local-only · Not investment advice. Recommendations are model-generated — verify before acting.
        </footer>
      </main>
    </div>
  );
}
