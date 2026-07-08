"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Bot,
  Building,
  DollarSign,
  Download,
  FileText,
  MessageCircle,
  Newspaper,
  RefreshCw,
  Shield,
  Sparkles,
  Table2,
  Target,
  Wallet,
  Wrench,
} from "lucide-react";
import { cn, formatCompactINR } from "@/lib/utils";
import { PortfolioCard } from "@/components/portfolio/portfolio-card";
import { usePortfolios, useActivePortfolio } from "@/hooks/use-portfolios";

interface CardMeta {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  span: string; // grid span classes
  tint: string; // subtle brand tint
  eta?: string;
  href?: string;
}

const CARDS: CardMeta[] = [
  {
    id: "portfolio",
    title: "Add Portfolio",
    subtitle: "Import from any broker in seconds",
    icon: Wallet,
    span: "md:col-span-2",
    tint: "from-emerald-500/20 to-emerald-400/0",
  },
  {
    id: "ai-chat-bot",
    title: "AI Chat Bot",
    subtitle: "Your personal investment assistant",
    icon: Bot,
    span: "md:col-span-1",
    tint: "from-fuchsia-400/20 to-fuchsia-400/0",
  },
  {
    id: "view-portfolio",
    title: "View Portfolio",
    subtitle: "Holdings, filters, drilldowns, exports",
    icon: Table2,
    span: "md:col-span-1",
    tint: "from-teal-400/20 to-teal-400/0",
    href: "/portfolio",
  },
  {
    id: "opportunities",
    title: "Opportunity Finder",
    subtitle: "Scan the market. Get scored Buy/Sell recs.",
    icon: Sparkles,
    span: "md:col-span-1",
    tint: "from-violet-400/20 to-violet-400/0",
    href: "/opportunities",
  },
  {
    id: "news",
    title: "News Intelligence",
    subtitle: "Portfolio-scoped news with Hinglish analysis",
    icon: Newspaper,
    span: "md:col-span-1",
    tint: "from-cyan-400/20 to-cyan-400/0",
    href: "/news",
  },
  {
    id: "tools",
    title: "Portfolio Tools",
    subtitle: "Dividends · SIP · Tax · Goal · Corp actions · Backup",
    icon: Wrench,
    span: "md:col-span-2",
    tint: "from-emerald-300/20 to-emerald-300/0",
    href: "/tools",
  },
  {
    id: "target",
    title: "Target Portfolio",
    subtitle: "Ideal allocation + smart rebalancing",
    icon: Target,
    span: "md:col-span-1",
    tint: "from-amber-400/20 to-amber-400/0",
    href: "/target",
  },
];

export function CardGrid() {
  return (
    <section
      className="grid auto-rows-[minmax(180px,auto)] grid-cols-1 gap-5 md:grid-cols-3 md:grid-rows-[minmax(360px,auto)_minmax(180px,auto)_minmax(180px,auto)]"
      aria-label="Dashboard cards"
    >
      {CARDS.map((c, idx) => (
        <motion.div
          key={c.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 * idx }}
          className={cn(c.span)}
        >
          {c.id === "portfolio" ? (
            <PortfolioCard />
          ) : c.id === "ai-chat-bot" ? (
            <AiChatBotTile meta={c} />
          ) : c.id === "view-portfolio" ? (
            <ViewPortfolioTile meta={c} />
          ) : c.id === "opportunities" ? (
            <OpportunityFinderTile meta={c} />
          ) : c.id === "news" ? (
            <NewsTile meta={c} />
          ) : c.id === "tools" ? (
            <PortfolioToolsTile meta={c} />
          ) : c.id === "target" ? (
            <TargetPortfolioTile meta={c} />
          ) : null}
        </motion.div>
      ))}
    </section>
  );
}

function ViewPortfolioTile({ meta }: { meta: CardMeta }) {
  const Icon = meta.icon;
  const portfolios = usePortfolios();
  const activePortfolio = useActivePortfolio();
  const hasData = (portfolios?.length ?? 0) > 0;
  const holdingCount = activePortfolio?.holdings.length ?? 0;
  const currentValue = activePortfolio?.totals.currentValue ?? 0;

  return (
    <Link
      href={meta.href ?? "#"}
      className={cn(
        "group relative flex h-full flex-col gap-3 overflow-hidden p-5 card-cyan card-hover",
      )}
    >
      <ChartIllustration />
      <div
        className={cn(
          "pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full blur-2xl opacity-40",
          "bg-gradient-to-br",
          meta.tint,
        )}
      />
      <div className="relative flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-500/[0.08]">
          <Icon className="h-5 w-5 text-cyan-300/90" />
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-500/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-200 transition-transform group-hover:translate-x-0.5">
          Explore
          <ArrowUpRight className="h-3 w-3" />
        </span>
      </div>
      <div className="relative mt-auto flex flex-col gap-1.5">
        <div className="font-display text-lg font-semibold">{meta.title}</div>
        <div className="text-sm text-muted-foreground">{meta.subtitle}</div>
        {hasData ? (
          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5">
              {holdingCount} holdings
            </span>
            {currentValue > 0 && (
              <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 money-tabular">
                {formatCompactINR(currentValue)}
              </span>
            )}
          </div>
        ) : null}
      </div>
    </Link>
  );
}

const DEMO_HEADLINES = [
  { ticker: "INFY", text: "Infosys beats Q4 estimates", sentiment: "positive" as const },
  { ticker: "TATAMOTORS", text: "Tata Motors falls 2% on weak demand", sentiment: "negative" as const },
  { ticker: "NIFTY", text: "Nifty 50 reaches new all-time high", sentiment: "positive" as const },
  { ticker: "RELIANCE", text: "Reliance Jio posts record subscriber growth", sentiment: "positive" as const },
];

function NewsTile({ meta }: { meta: CardMeta }) {
  const Icon = meta.icon;
  const portfolios = usePortfolios();
  const activePortfolio = useActivePortfolio();
  const hasData = (portfolios?.length ?? 0) > 0;
  const stockCount = activePortfolio?.holdings.length ?? 0;

  return (
    <Link
      href={meta.href ?? "#"}
      className={cn(
        "group relative flex h-full flex-col gap-2 overflow-hidden p-5 card-blue card-hover",
      )}
    >
      <NewsIllustration />
      <div
        className={cn(
          "pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full blur-2xl opacity-40",
          "bg-gradient-to-br",
          meta.tint,
        )}
      />
      <div className="relative flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-400/25 bg-blue-500/[0.08]">
          <Icon className="h-5 w-5 text-blue-300/90" />
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-blue-400/30 bg-blue-500/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-200 transition-transform group-hover:translate-x-0.5">
          Explore
          <ArrowUpRight className="h-3 w-3" />
        </span>
      </div>
      <div className="relative mt-auto flex flex-col gap-2">
        <div className="font-display text-lg font-semibold">{meta.title}</div>
        <div className="space-y-1.5">
          {DEMO_HEADLINES.slice(0, hasData && stockCount > 0 ? 4 : 3).map((h) => (
            <div key={h.ticker} className="flex items-center gap-2 text-xs">
              <span className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                h.sentiment === "positive" ? "bg-emerald-400" : "bg-red-400",
              )} />
              <span className="text-muted-foreground truncate">{h.text}</span>
            </div>
          ))}
        </div>
        {hasData && stockCount > 0 && (
          <div className="text-[11px] text-muted-foreground/60">
            {stockCount} stock{stockCount === 1 ? "" : "s"} tracked · View all →
          </div>
        )}
      </div>
    </Link>
  );
}

const DEMO_ALLOCATIONS_DETAILED = [
  { label: "Stocks", pct: 55, color: "#34d399", hex: "text-emerald-400" },
  { label: "Mutual Funds", pct: 20, color: "#fbbf24", hex: "text-amber-400" },
  { label: "ETFs", pct: 12, color: "#60a5fa", hex: "text-blue-400" },
  { label: "Gold", pct: 8, color: "#f59e0b", hex: "text-amber-500" },
  { label: "Cash", pct: 5, color: "#a78bfa", hex: "text-violet-400" },
] as const;

function DonutChart() {
  const cx = 50, cy = 50, r = 36, sw = 10;
  const circ = 2 * Math.PI * r;
  const dashes = DEMO_ALLOCATIONS_DETAILED.map(
    (seg) => (seg.pct / 100) * circ,
  );
  const offsets = dashes.reduce<number[]>(
    (acc, _, i) => [...acc, i === 0 ? 0 : acc[i - 1] + dashes[i - 1]],
    [],
  );
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
      {DEMO_ALLOCATIONS_DETAILED.map((seg, i) => (
        <circle
          key={seg.label}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={seg.color}
          strokeWidth={sw}
          strokeDasharray={`${dashes[i]} ${circ - dashes[i]}`}
          strokeDashoffset={-offsets[i]}
          strokeLinecap="round"
          opacity={0.8}
          className="transition-all duration-700"
        />
      ))}
      {/* inner circle with score */}
      <circle cx={cx} cy={cy} r={r - sw} fill="rgba(0,0,0,0.3)" />
      <text x={cx} y={cy - 4} textAnchor="middle" fill="white" fontSize="18" fontWeight="700" fontFamily="Sora,system-ui">47</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="7" fontWeight="500">SCORE</text>
    </svg>
  );
}

function TargetPortfolioTile({ meta }: { meta: CardMeta }) {
  const Icon = meta.icon;

  return (
    <Link
      href={meta.href ?? "#"}
      className={cn(
        "group relative flex h-full flex-col gap-2 overflow-hidden p-5 card-gold card-hover",
      )}
    >
      <TargetIllustration />
      <div
        className={cn(
          "pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full blur-2xl opacity-40",
          "bg-gradient-to-br",
          meta.tint,
        )}
      />
      <div className="relative flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-500/[0.08]">
          <Icon className="h-5 w-5 text-amber-300/90" />
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200 transition-transform group-hover:translate-x-0.5">
          Explore
          <ArrowUpRight className="h-3 w-3" />
        </span>
      </div>
      <div className="relative flex flex-1 gap-3">
        {/* Donut chart */}
        <div className="flex h-24 w-24 shrink-0 items-center justify-center">
          <DonutChart />
        </div>
        {/* Allocation breakdown */}
        <div className="flex flex-1 flex-col justify-center gap-1">
          {DEMO_ALLOCATIONS_DETAILED.map((a) => (
            <div key={a.label} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: a.color }} />
              <div className="flex flex-1 items-center justify-between text-xs">
                <span className="text-muted-foreground/80">{a.label}</span>
                <span className="font-medium text-muted-foreground/90">{a.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Rebalance CTA */}
      <div className="relative mt-auto flex items-center justify-between rounded-lg border border-amber-400/20 bg-amber-500/[0.05] px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse-soft" />
          <span className="text-xs text-amber-200/80 font-medium">Rebalance needed</span>
        </div>
        <span className="text-[11px] font-semibold text-amber-300/90">Rebalance →</span>
      </div>
    </Link>
  );
}

interface ToolItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
  color: string;
}

const TOOLS: ToolItem[] = [
  { icon: DollarSign, label: "Dividends", desc: "Track & forecast", color: "text-emerald-300" },
  { icon: Target, label: "Goal Planner", desc: "Set targets", color: "text-amber-300" },
  { icon: RefreshCw, label: "SIP Calculator", desc: "Plan investments", color: "text-cyan-300" },
  { icon: FileText, label: "Tax P&L", desc: "STCG/LTCG calc", color: "text-violet-300" },
  { icon: Building, label: "Corporate Actions", desc: "Splits & bonuses", color: "text-blue-300" },
  { icon: Shield, label: "Backup & Restore", desc: "Secure export", color: "text-emerald-300" },
  { icon: Download, label: "Export Report", desc: "CSV · PDF · JSON", color: "text-indigo-300" },
  { icon: Activity, label: "Risk Analysis", desc: "Portfolio health", color: "text-rose-300" },
];

function PortfolioToolsTile({ meta }: { meta: CardMeta }) {
  const Icon = meta.icon;
  return (
    <Link
      href={meta.href ?? "#"}
      className={cn(
        "group relative flex h-full flex-col gap-2 overflow-hidden p-5 card-emerald card-hover",
      )}
    >
      <ToolsIllustration />
      <div
        className={cn(
          "pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full blur-2xl opacity-40",
          "bg-gradient-to-br",
          meta.tint,
        )}
      />
      <div className="relative flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-500/[0.08]">
          <Icon className="h-5 w-5 text-emerald-200/90" />
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-200 transition-transform group-hover:translate-x-0.5">
          Explore
          <ArrowUpRight className="h-3 w-3" />
        </span>
      </div>
      <div className="relative flex flex-col gap-2">
        <div className="font-display text-lg font-semibold">{meta.title}</div>
        <div className="grid grid-cols-4 gap-1.5">
          {TOOLS.map((tool) => (
            <div
              key={tool.label}
              className="group/tool flex flex-col items-center gap-1 rounded-lg border border-white/[0.04] bg-white/[0.02] px-1.5 py-2 transition-all duration-200 hover:bg-white/[0.06] hover:border-white/[0.10]"
            >
              <tool.icon className={cn("h-4 w-4", tool.color)} />
              <span className="text-[9px] font-medium text-muted-foreground/80 leading-tight text-center">
                {tool.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}

const AI_FEATURES = [
  "Portfolio Analysis",
  "Risk Detection",
  "AI Chat Support",
  "Investment Suggestions",
];

function AiChatBotTile({ meta }: { meta: CardMeta }) {
  const Icon = meta.icon;
  return (
    <div
      className={cn(
        "group relative flex h-full flex-col gap-2 overflow-hidden p-5 card-purple",
        "cursor-default select-none",
      )}
    >
      <NeuralIllustration />
      <div
        className={cn(
          "pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full blur-2xl opacity-40",
          "bg-gradient-to-br",
          meta.tint,
        )}
      />
      <div className="relative flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-400/25 bg-purple-500/[0.08]">
          <Icon className="h-5 w-5 text-fuchsia-300/90" />
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-purple-400/30 bg-purple-500/[0.08] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-purple-200">
          Coming Soon
        </span>
      </div>
      <div className="relative mt-auto flex flex-col gap-1.5">
        <div className="font-display text-lg font-semibold">{meta.title}</div>
        <div className="text-sm text-muted-foreground">{meta.subtitle}</div>
        <div className="mt-0.5 space-y-1">
          {AI_FEATURES.map((f) => (
            <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground/70">
              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-purple-400/30 bg-purple-400/10">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-300/60" />
              </span>
              {f}
            </div>
          ))}
        </div>
        <div className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-purple-400/25 bg-purple-500/[0.06] px-3 py-1.5 text-xs font-medium text-purple-200 transition-all hover:bg-purple-500/[0.12]">
          <MessageCircle className="h-3.5 w-3.5" />
          Ask AI
        </div>
      </div>
    </div>
  );
}

function ChartIllustration() {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="pointer-events-none absolute -bottom-2 right-0 h-36 w-36 opacity-10"
      style={{ mixBlendMode: "screen" }}
      aria-hidden
    >
      <path d="M30 160l25-40 30 10 35-50 25 60 25-30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-300" />
      <rect x="25" y="40" width="150" height="120" rx="8" stroke="currentColor" strokeWidth="1" className="text-cyan-300/30" />
      <path d="M40 170h120" stroke="currentColor" strokeWidth="1" className="text-cyan-300/20" />
      <circle cx="140" cy="90" r="15" stroke="currentColor" strokeWidth="1" className="text-cyan-300/40" />
      <path d="M135 90l5 5 10-10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-300/60" />
    </svg>
  );
}

function TargetIllustration() {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="pointer-events-none absolute -bottom-4 -right-4 h-36 w-36 opacity-10"
      style={{ mixBlendMode: "screen" }}
      aria-hidden
    >
      <circle cx="100" cy="100" r="60" stroke="currentColor" strokeWidth="1.5" className="text-amber-300/40" />
      <circle cx="100" cy="100" r="40" stroke="currentColor" strokeWidth="1.5" className="text-amber-300/50" />
      <circle cx="100" cy="100" r="20" stroke="currentColor" strokeWidth="2" className="text-amber-300/70" />
      <circle cx="100" cy="100" r="6" fill="currentColor" className="text-amber-300/80" />
      <path d="M100 30v25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-amber-300/40" />
      <path d="M130 45l-8 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-amber-300/30" />
      <path d="M155 70l-14 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-amber-300/30" />
    </svg>
  );
}

function NeuralIllustration() {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="pointer-events-none absolute right-2 top-1/2 h-36 w-36 -translate-y-1/2 opacity-10"
      style={{ mixBlendMode: "screen" }}
      aria-hidden
    >
      <circle cx="60" cy="50" r="6" stroke="currentColor" strokeWidth="1.5" className="text-fuchsia-300/60" />
      <circle cx="130" cy="30" r="6" stroke="currentColor" strokeWidth="1.5" className="text-fuchsia-300/60" />
      <circle cx="160" cy="80" r="6" stroke="currentColor" strokeWidth="1.5" className="text-fuchsia-300/60" />
      <circle cx="50" cy="120" r="6" stroke="currentColor" strokeWidth="1.5" className="text-fuchsia-300/60" />
      <circle cx="110" cy="100" r="8" stroke="currentColor" strokeWidth="2" className="text-fuchsia-300/80" />
      <circle cx="140" cy="150" r="6" stroke="currentColor" strokeWidth="1.5" className="text-fuchsia-300/60" />
      <circle cx="70" cy="170" r="6" stroke="currentColor" strokeWidth="1.5" className="text-fuchsia-300/60" />
      <path d="M60 50l70-20M60 50l-10 70M130 30l30 50M130 30l-20 70M50 120l60-20M50 120l20 50M110 100l30 50M110 100l-40 70M140 150l-70 20M70 170l40-70" stroke="currentColor" strokeWidth="0.8" className="text-fuchsia-300/25" />
      <path d="M155 120l15 25-20-5c-8 3-16 5-25 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-fuchsia-300/40" />
      <path d="M130 140c-15 0-28-10-28-22s13-22 28-22 28 10 28 22c0 7-4 13-10 17" stroke="currentColor" strokeWidth="1" className="text-fuchsia-300/30" />
    </svg>
  );
}

function NewsIllustration() {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="pointer-events-none absolute -right-2 -top-2 h-36 w-36 opacity-10"
      style={{ mixBlendMode: "screen" }}
      aria-hidden
    >
      <rect x="35" y="30" width="130" height="140" rx="6" stroke="currentColor" strokeWidth="1.5" className="text-blue-300/50" />
      <line x1="55" y1="55" x2="145" y2="55" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-blue-300/40" />
      <line x1="55" y1="70" x2="130" y2="70" stroke="currentColor" strokeWidth="1" strokeLinecap="round" className="text-blue-300/30" />
      <line x1="55" y1="85" x2="145" y2="85" stroke="currentColor" strokeWidth="1" strokeLinecap="round" className="text-blue-300/30" />
      <rect x="55" y="100" width="90" height="45" rx="4" stroke="currentColor" strokeWidth="1" className="text-blue-300/30" />
      <line x1="65" y1="112" x2="130" y2="112" stroke="currentColor" strokeWidth="0.8" className="text-blue-300/20" />
      <line x1="65" y1="122" x2="115" y2="122" stroke="currentColor" strokeWidth="0.8" className="text-blue-300/20" />
      <line x1="65" y1="132" x2="100" y2="132" stroke="currentColor" strokeWidth="0.8" className="text-blue-300/20" />
      <circle cx="160" cy="160" r="25" stroke="currentColor" strokeWidth="0.8" className="text-blue-300/20" />
      <ellipse cx="160" cy="160" rx="12" ry="25" stroke="currentColor" strokeWidth="0.5" className="text-blue-300/15" />
    </svg>
  );
}

function AnalyticsIllustration() {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="pointer-events-none absolute -right-4 bottom-0 h-36 w-36 opacity-10"
      style={{ mixBlendMode: "screen" }}
      aria-hidden
    >
      <rect x="30" y="50" width="140" height="110" rx="8" stroke="currentColor" strokeWidth="1.5" className="text-violet-300/40" />
      <rect x="45" y="65" width="25" height="40" rx="3" fill="currentColor" className="text-violet-300/15" />
      <rect x="80" y="55" width="25" height="50" rx="3" fill="currentColor" className="text-violet-300/20" />
      <rect x="115" y="75" width="25" height="30" rx="3" fill="currentColor" className="text-violet-300/15" />
      <path d="M45 125l25-20 35 10 40-30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-300/60" />
      <circle cx="165" cy="35" r="18" stroke="currentColor" strokeWidth="1" className="text-violet-300/25" />
      <path d="M160 35l5 5 8-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-violet-300/40" />
    </svg>
  );
}

function ToolsIllustration() {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="pointer-events-none absolute -bottom-4 -right-4 h-36 w-36 opacity-10"
      style={{ mixBlendMode: "screen" }}
      aria-hidden
    >
      <circle cx="100" cy="100" r="55" stroke="currentColor" strokeWidth="1.5" className="text-emerald-300/40" />
      <circle cx="100" cy="100" r="35" stroke="currentColor" strokeWidth="1" className="text-emerald-300/25" />
      <rect x="70" y="70" width="60" height="60" rx="6" stroke="currentColor" strokeWidth="1.2" className="text-emerald-300/30" />
      <path d="M85 100l10 10 20-20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-300/50" />
      <path d="M50 140l30-30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-emerald-300/25" />
      <path d="M140 50l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-emerald-300/20" />
      <path d="M155 35l5 5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" className="text-emerald-300/15" />
    </svg>
  );
}

function OpportunityFinderTile({ meta }: { meta: CardMeta }) {
  const Icon = meta.icon;
  return (
    <Link
      href={meta.href ?? "#"}
      className={cn(
        "group relative flex h-full flex-col gap-3 overflow-hidden p-5 card-indigo card-hover",
      )}
    >
      <AnalyticsIllustration />
      <div
        className={cn(
          "pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full blur-2xl opacity-40",
          "bg-gradient-to-br",
          meta.tint,
        )}
      />
      <div className="relative flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-400/25 bg-indigo-500/[0.08]">
          <Icon className="h-5 w-5 text-violet-300/90" />
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-indigo-400/30 bg-indigo-500/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-200 transition-transform group-hover:translate-x-0.5">
          Explore
          <ArrowUpRight className="h-3 w-3" />
        </span>
      </div>
      <div className="relative mt-auto flex flex-col gap-1.5">
        <div className="font-display text-lg font-semibold">{meta.title}</div>
        <div className="text-sm text-muted-foreground">{meta.subtitle}</div>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5">
            180 stocks tracked
          </span>
        </div>
      </div>
    </Link>
  );
}
