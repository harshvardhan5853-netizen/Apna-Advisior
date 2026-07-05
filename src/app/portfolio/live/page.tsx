"use client";

import Link from "next/link";
import { ArrowLeft, Radio } from "lucide-react";
import { LiveView } from "@/components/portfolio-view/live-portfolio/live-view";

export default function LivePortfolioRoute() {
  return (
    <div className="relative min-h-screen">
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.15]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(16,185,129,0.12) 0px, rgba(16,185,129,0.12) 1px, transparent 1px, transparent 56px), repeating-linear-gradient(90deg, rgba(16,185,129,0.12) 0px, rgba(16,185,129,0.12) 1px, transparent 1px, transparent 56px)",
        }}
      />
      <div className="pointer-events-none fixed -top-32 left-1/2 -z-10 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-emerald-500/[0.08] blur-3xl" />

      <main className="container relative mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 md:py-14">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/portfolio"
              className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-emerald-400/40 hover:text-emerald-300"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to portfolio
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/[0.08] px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-emerald-200">
              <Radio className="h-3 w-3" />
              Live
            </span>
          </div>
          <div>
            <h1 className="font-display text-3xl font-semibold leading-tight md:text-4xl">
              <span className="text-emerald-gradient">Live</span> portfolio
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Real-time prices from Yahoo Finance · auto-refresh every 20 seconds during market hours.
            </p>
          </div>
        </header>

        <LiveView />

        <footer className="mt-6 text-center text-[11px] text-muted-foreground">
          Prices are delayed by the upstream provider. Not investment advice. Local-only · Nothing leaves your device except quote requests.
        </footer>
      </main>
    </div>
  );
}
