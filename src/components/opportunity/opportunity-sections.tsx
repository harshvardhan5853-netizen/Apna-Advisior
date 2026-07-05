"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, TrendingUp, ArrowUpRight, Minus, ArrowDownRight, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OpportunityAnalysis, Recommendation } from "@/types/opportunity";
import { OpportunityCard } from "./opportunity-card";

interface OpportunitySectionsProps {
  analyses: OpportunityAnalysis[];
  onSelectAnalysis?: (a: OpportunityAnalysis) => void;
  portfolioSymbols?: string[];
  className?: string;
}

interface SectionMeta {
  key: Recommendation;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  ring: string;
  text: string;
  iconBg: string;
}

const SECTIONS: SectionMeta[] = [
  { key: "strong-buy", label: "Strong Buy", icon: TrendingUp, ring: "ring-emerald-400/40", text: "text-emerald-200", iconBg: "bg-emerald-500/20 text-emerald-200" },
  { key: "buy", label: "Buy", icon: ArrowUpRight, ring: "ring-emerald-400/30", text: "text-emerald-200", iconBg: "bg-emerald-500/15 text-emerald-200" },
  { key: "hold", label: "Hold", icon: Minus, ring: "ring-amber-400/30", text: "text-amber-200", iconBg: "bg-amber-500/15 text-amber-200" },
  { key: "sell", label: "Sell", icon: ArrowDownRight, ring: "ring-red-400/30", text: "text-red-200", iconBg: "bg-red-500/15 text-red-200" },
  { key: "strong-sell", label: "Strong Sell", icon: TrendingDown, ring: "ring-red-500/50", text: "text-red-100", iconBg: "bg-red-500/25 text-red-100" },
];

const DEFAULT_OPEN: Recommendation[] = ["strong-buy", "buy"];

export function OpportunitySections({ analyses, onSelectAnalysis, portfolioSymbols, className }: OpportunitySectionsProps) {
  const [openSet, setOpenSet] = React.useState<Set<Recommendation>>(() => new Set(DEFAULT_OPEN));

  const grouped = React.useMemo(() => {
    const map = new Map<Recommendation, OpportunityAnalysis[]>();
    for (const meta of SECTIONS) map.set(meta.key, []);
    for (const a of analyses) {
      const bucket = map.get(a.recommendation);
      if (bucket) bucket.push(a);
    }
    for (const key of map.keys()) {
      map.get(key)!.sort((a, b) => b.advisorScore - a.advisorScore);
    }
    return map;
  }, [analyses]);

  const portfolioSet = React.useMemo(
    () => new Set((portfolioSymbols ?? []).map((s) => s.toUpperCase())),
    [portfolioSymbols],
  );

  function toggle(key: Recommendation) {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {SECTIONS.map((section) => {
        const items = grouped.get(section.key) ?? [];
        const isOpen = openSet.has(section.key);
        const Icon = section.icon;
        return (
          <section key={section.key} className={cn("glass overflow-hidden rounded-2xl border border-white/[0.05] ring-1", section.ring)}>
            <button
              type="button"
              onClick={() => toggle(section.key)}
              className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
            >
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", section.iconBg)}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className={cn("font-display text-base font-semibold", section.text)}>{section.label}</div>
                <div className="text-xs text-muted-foreground">
                  {items.length} {items.length === 1 ? "opportunity" : "opportunities"}
                </div>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                {items.length}
              </span>
              <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.18 }} className="text-muted-foreground">
                <ChevronDown className="h-4 w-4" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <div className="border-t border-white/[0.05] px-5 py-5">
                    {items.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-6 text-center text-sm text-muted-foreground">
                        No {section.label.toLowerCase()} candidates in the current filter.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {items.map((a) => (
                          <OpportunityCard
                            key={a.symbol}
                            analysis={a}
                            onOpenDrawer={onSelectAnalysis}
                            className={portfolioSet.has(a.symbol.toUpperCase()) ? "ring-1 ring-emerald-400/30" : undefined}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        );
      })}
    </div>
  );
}
