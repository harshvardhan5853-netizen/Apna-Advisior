"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, ArrowLeft, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PortfolioViewEmptyState() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-emerald-500/[0.05] via-white/[0.02] to-white/[0.01] p-8 md:p-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-teal-400/10 blur-3xl"
      />
      <div className="relative flex flex-col items-center gap-6 text-center md:flex-row md:text-left">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative"
        >
          <WealthGlyph />
        </motion.div>

        <div className="flex-1">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-200">
            <Sparkles className="h-3 w-3" /> No holdings to view
          </div>
          <h3 className="font-display text-2xl font-semibold md:text-3xl">
            Bring your <span className="text-emerald-gradient">portfolio to life</span>.
          </h3>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            Create a portfolio from the dashboard — CSV, Excel, PDF, or a screenshot from any broker
            works. Once holdings are in, this page becomes your command center for analysis, filters,
            exports, and AI-ready dataset generation.
          </p>
          <div className="mt-5">
            <Button asChild size="lg" className="shadow-glow-emerald">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" /> Go to dashboard
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WealthGlyph() {
  return (
    <div className="relative">
      <div className="absolute inset-0 rounded-3xl bg-emerald-400/30 blur-2xl" />
      <div className="relative flex h-32 w-32 items-center justify-center rounded-3xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/25 to-emerald-500/[0.02]">
        <svg
          viewBox="0 0 64 64"
          className="h-20 w-20"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <defs>
            <linearGradient id="wg2" x1="0" x2="1" y1="1" y2="0">
              <stop offset="0" stopColor="#6ee7b7" />
              <stop offset="1" stopColor="#10b981" />
            </linearGradient>
          </defs>
          <rect x="6" y="34" width="8" height="20" rx="1.5" stroke="url(#wg2)" strokeWidth={2.5} />
          <rect x="18" y="24" width="8" height="30" rx="1.5" stroke="url(#wg2)" strokeWidth={2.5} />
          <rect x="30" y="14" width="8" height="40" rx="1.5" stroke="url(#wg2)" strokeWidth={2.5} />
          <rect x="42" y="20" width="8" height="34" rx="1.5" stroke="url(#wg2)" strokeWidth={2.5} />
          <path d="M6 12 L18 18 L30 8 L42 14 L58 6" stroke="url(#wg2)" strokeWidth={2.5} />
        </svg>
      </div>
      <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/15 text-emerald-200">
        <LineChart className="h-4 w-4" />
      </div>
    </div>
  );
}
