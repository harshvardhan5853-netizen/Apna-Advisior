"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  CalendarDays,
  Coins,
  Database,
  IndianRupee,
  Repeat,
  Target as TargetIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolMeta {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  tint: string;
  accent: string;
  hoverBorder: string;
}

const TOOLS: ToolMeta[] = [
  {
    id: "dividend",
    title: "Dividend Tracker",
    subtitle:
      "Detect declared dividends from portfolio news, project annual income, per-stock yield.",
    icon: Coins,
    href: "/tools/dividend",
    tint: "from-amber-400/20 to-amber-400/0",
    accent: "text-amber-200",
    hoverBorder: "hover:border-amber-400/30",
  },
  {
    id: "goal",
    title: "Goal Planner",
    subtitle:
      "Set a target corpus + horizon, see the monthly SIP required at your expected return.",
    icon: TargetIcon,
    href: "/tools/goal",
    tint: "from-emerald-400/20 to-emerald-400/0",
    accent: "text-emerald-200",
    hoverBorder: "hover:border-emerald-400/30",
  },
  {
    id: "sip",
    title: "SIP Calculator",
    subtitle:
      "Future value, lumpsum vs SIP, step-up SIP scenarios with year-by-year breakdown.",
    icon: Repeat,
    href: "/tools/sip",
    tint: "from-cyan-400/20 to-cyan-400/0",
    accent: "text-cyan-200",
    hoverBorder: "hover:border-cyan-400/30",
  },
  {
    id: "tax",
    title: "Tax P&L Calculator",
    subtitle:
      "STCG 20% + LTCG 12.5% above ₹1.25L exemption (Budget 2024) with rate table.",
    icon: IndianRupee,
    href: "/tools/tax",
    tint: "from-rose-400/20 to-rose-400/0",
    accent: "text-rose-200",
    hoverBorder: "hover:border-rose-400/30",
  },
  {
    id: "corporate-actions",
    title: "Corporate Actions Calendar",
    subtitle:
      "Splits, bonuses, dividends, buybacks & M&A picked up from portfolio news.",
    icon: CalendarDays,
    href: "/tools/corporate-actions",
    tint: "from-violet-400/20 to-violet-400/0",
    accent: "text-violet-200",
    hoverBorder: "hover:border-violet-400/30",
  },
  {
    id: "backup",
    title: "Backup &amp; Restore",
    subtitle:
      "Export every portfolio, target, rebalance log, news setting to a JSON file. Restore any time.",
    icon: Database,
    href: "/tools/backup",
    tint: "from-teal-400/20 to-teal-400/0",
    accent: "text-teal-200",
    hoverBorder: "hover:border-teal-400/30",
  },
];

export function ToolsHub() {
  return (
    <section
      className="grid auto-rows-[minmax(180px,auto)] grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
      aria-label="Portfolio tools"
    >
      {TOOLS.map((tool, idx) => (
        <motion.div
          key={tool.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.04 * idx }}
        >
          <ToolTile tool={tool} />
        </motion.div>
      ))}
    </section>
  );
}

function ToolTile({ tool }: { tool: ToolMeta }) {
  const Icon = tool.icon;
  return (
    <Link
      href={tool.href}
      className={cn(
        "group relative flex h-full flex-col gap-3 overflow-hidden p-5 glass",
        "transition-transform duration-300 hover:-translate-y-0.5",
        tool.hoverBorder,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-radial blur-2xl opacity-70",
          "bg-gradient-to-br",
          tool.tint,
        )}
      />
      <div className="relative flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
          <Icon className={cn("h-5 w-5", tool.accent)} />
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border bg-white/[0.03] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-transform group-hover:translate-x-0.5",
            tool.accent,
            "border-white/[0.10]",
          )}
        >
          Open
          <ArrowUpRight className="h-3 w-3" />
        </span>
      </div>
      <div className="relative mt-auto flex flex-col gap-1.5">
        <div className="font-display text-lg font-semibold">{tool.title}</div>
        <div className="text-sm text-muted-foreground">{tool.subtitle}</div>
      </div>
    </Link>
  );
}
