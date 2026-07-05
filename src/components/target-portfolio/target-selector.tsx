"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Target, Star, Archive, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { TargetPortfolio } from "@/types/target-portfolio";

interface TargetSelectorProps {
  portfolios: TargetPortfolio[];
  activeId: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  showArchived?: boolean;
}

export function TargetSelector({
  portfolios,
  activeId,
  selectedId,
  onSelect,
  onCreate,
  showArchived = true,
}: TargetSelectorProps) {
  const filtered = React.useMemo(
    () => (showArchived ? portfolios : portfolios.filter((p) => p.status !== "archived")),
    [portfolios, showArchived],
  );

  return (
    <div className="glass flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Target portfolio</div>
          <div className="font-display text-lg font-semibold">Your ideal allocations</div>
        </div>
        <Button size="sm" onClick={onCreate} className="shadow-glow-emerald">
          <Plus className="h-4 w-4" /> New target
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {filtered.map((p) => {
          const isActive = p.id === activeId;
          const isArchived = p.status === "archived";
          return (
            <TargetChip
              key={p.id}
              selected={selectedId === p.id}
              onClick={() => onSelect(p.id)}
              icon={
                isActive ? (
                  <Star className="h-3.5 w-3.5 text-amber-300" fill="currentColor" />
                ) : isArchived ? (
                  <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <Target className="h-3.5 w-3.5 text-amber-300" />
                )
              }
              label={p.name}
              sub={`${p.allocations.length} stocks \u00b7 ${isArchived ? "Archived" : "Active"}`}
              preset={p.origin?.preset ?? null}
            />
          );
        })}
        {filtered.length === 0 && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-muted-foreground">
            No target portfolios yet. Click <span className="text-amber-200">New target</span> to create your first ideal allocation.
          </div>
        )}
      </div>
    </div>
  );
}

interface TargetChipProps {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sub: string;
  preset: string | null;
}

function TargetChip({ selected, onClick, icon, label, sub, preset }: TargetChipProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative flex min-w-[220px] flex-1 flex-col items-start gap-2 overflow-hidden rounded-xl border p-3 text-left transition-colors",
        selected
          ? "border-amber-400/50 bg-amber-500/[0.08] shadow-glow-emerald"
          : "border-white/[0.08] bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05]",
      )}
    >
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-white/[0.04]">
            {icon}
          </div>
          <div className="text-sm font-semibold text-foreground line-clamp-1">{label}</div>
        </div>
        {preset ? (
          <span className="rounded-full border border-amber-400/25 bg-amber-500/[0.06] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-200">
            {preset}
          </span>
        ) : null}
      </div>
      <div className="text-[11px] text-muted-foreground line-clamp-1">{sub}</div>
    </motion.button>
  );
}
