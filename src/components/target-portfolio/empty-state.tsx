"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Plus, Target, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TargetEmptyStateProps {
  onCreate: () => void;
}

export function TargetEmptyState({ onCreate }: TargetEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl border border-amber-400/15 bg-gradient-to-br from-amber-500/[0.06] via-transparent to-emerald-500/[0.04] p-8 md:p-10"
    >
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-5">
          <TargetGlyph />
          <div>
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-500/[0.08] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-200">
              <Sparkles className="h-3 w-3" />
              Get started
            </span>
            <h2 className="mt-3 font-display text-2xl font-semibold leading-tight md:text-3xl">
              Create your <span className="text-emerald-gradient">ideal portfolio</span>
            </h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Set target weights per stock and let Apna Advisor tell you exactly how much to invest, what to trim, and how close you are to your dream allocation.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-3 md:items-end">
          <Button size="lg" onClick={onCreate} className="shadow-glow-emerald">
            <Plus className="h-4 w-4" /> Create Target Portfolio
          </Button>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Choose a template or start blank
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function TargetGlyph() {
  return (
    <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl border border-amber-400/20 bg-amber-500/[0.04] backdrop-blur">
      <Target className="h-12 w-12 text-amber-300" strokeWidth={1.2} />
      <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/20 shadow-glow-emerald">
        <TrendingUp className="h-4 w-4 text-emerald-200" />
      </div>
    </div>
  );
}
