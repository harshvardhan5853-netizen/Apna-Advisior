"use client";

import { motion } from "framer-motion";
import { Sparkles, Plus, TrendingUp, FileSpreadsheet, FileText, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onCreate: () => void;
}

export function EmptyState({ onCreate }: EmptyStateProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-emerald-500/[0.05] via-white/[0.02] to-white/[0.01] p-6 md:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl"
      />
      <div className="relative flex flex-col items-center gap-5 text-center md:flex-row md:text-left">
        {/* Wealth illustration — pure SVG, no external asset */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative"
        >
          <WealthGlyph />
        </motion.div>

        <div className="flex-1">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-200">
            <Sparkles className="h-3 w-3" /> Get started
          </div>
          <h3 className="font-display text-xl font-semibold md:text-2xl">
            Start your <span className="text-emerald-gradient">wealth journey</span> by
            creating your first portfolio.
          </h3>
          <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
            Bring holdings from any broker — a CSV, an Excel sheet, a PDF, or even a screenshot.
            Everything stays private on your device.
          </p>
          <div className="mt-4 flex flex-col items-center gap-3 md:items-start">
            <Button size="lg" onClick={onCreate} className="shadow-glow-emerald">
              <Plus className="h-4 w-4" /> Create Portfolio
            </Button>
            <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-muted-foreground md:justify-start">
              <span className="uppercase tracking-wider">Supports</span>
              <FormatChip icon={<FileSpreadsheet className="h-3 w-3" />} label="CSV · XLSX" />
              <FormatChip icon={<FileText className="h-3 w-3" />} label="PDF" />
              <FormatChip icon={<ImageIcon className="h-3 w-3" />} label="Screenshot" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormatChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      {icon}
      {label}
    </span>
  );
}

function WealthGlyph() {
  return (
    <div className="relative">
      <div className="absolute inset-0 rounded-3xl bg-emerald-400/30 blur-2xl" />
      <div className="relative flex h-28 w-28 items-center justify-center rounded-3xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/25 to-emerald-500/[0.02]">
        <svg
          viewBox="0 0 64 64"
          className="h-16 w-16"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <defs>
            <linearGradient id="wg" x1="0" x2="1" y1="1" y2="0">
              <stop offset="0" stopColor="#6ee7b7" />
              <stop offset="1" stopColor="#10b981" />
            </linearGradient>
          </defs>
          <path
            d="M6 48 L22 32 L32 40 L46 22 L58 30"
            stroke="url(#wg)"
            strokeWidth={2.5}
          />
          <path d="M50 22 L58 22 L58 30" stroke="url(#wg)" strokeWidth={2.5} />
          <circle cx="22" cy="32" r="2.5" fill="#6ee7b7" stroke="none" />
          <circle cx="32" cy="40" r="2.5" fill="#6ee7b7" stroke="none" />
          <circle cx="46" cy="22" r="2.5" fill="#6ee7b7" stroke="none" />
        </svg>
      </div>
      <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/15 text-emerald-200">
        <TrendingUp className="h-4 w-4" />
      </div>
    </div>
  );
}
