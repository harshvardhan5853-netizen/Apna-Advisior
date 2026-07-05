"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowUpRight,
  Newspaper,
  Sparkles,
  Table2,
  Target,
  Wallet,
  Wrench,
} from "lucide-react";
import { cn, formatCompactINR } from "@/lib/utils";
import { PortfolioCard } from "@/components/portfolio/portfolio-card";
import { usePortfolios, useActivePortfolio } from "@/hooks/use-portfolios";
import {
  useActiveTargetPortfolio,
  useTargetPortfolios,
} from "@/hooks/use-target-portfolios";

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
    span: "md:col-span-2 md:row-span-2",
    tint: "from-emerald-500/20 to-emerald-400/0",
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
    id: "target",
    title: "Target Portfolio",
    subtitle: "Ideal allocation + smart rebalancing",
    icon: Target,
    span: "md:col-span-1",
    tint: "from-amber-400/20 to-amber-400/0",
    href: "/target",
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
    id: "opportunities",
    title: "Opportunity Finder",
    subtitle: "Scan the market. Get scored Buy/Sell recs.",
    icon: Sparkles,
    span: "md:col-span-1",
    tint: "from-violet-400/20 to-violet-400/0",
    href: "/opportunities",
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
];

export function CardGrid() {
  return (
    <section
      className="grid auto-rows-[minmax(180px,auto)] grid-cols-1 gap-5 md:grid-cols-3"
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
          ) : c.id === "view-portfolio" ? (
            <ViewPortfolioTile meta={c} />
          ) : c.id === "news" ? (
            <NewsTile meta={c} />
          ) : c.id === "target" ? (
            <TargetPortfolioTile meta={c} />
          ) : c.id === "opportunities" ? (
            <OpportunityFinderTile meta={c} />
          ) : c.id === "tools" ? (
            <PortfolioToolsTile meta={c} />
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
        "group relative flex h-full flex-col gap-3 overflow-hidden p-5 glass",
        "transition-transform duration-300 hover:-translate-y-0.5 hover:border-emerald-400/30",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-radial blur-2xl opacity-70",
          "bg-gradient-to-br",
          meta.tint,
        )}
      />
      <div className="relative flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
          <Icon className="h-5 w-5 text-emerald-300/90" />
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300 transition-transform group-hover:translate-x-0.5">
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
        "group relative flex h-full flex-col gap-3 overflow-hidden p-5 glass",
        "transition-transform duration-300 hover:-translate-y-0.5 hover:border-cyan-400/30",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-radial blur-2xl opacity-70",
          "bg-gradient-to-br",
          meta.tint,
        )}
      />
      <div className="relative flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
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
        {hasData && stockCount > 0 ? (
          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5">
              {stockCount} stock{stockCount === 1 ? "" : "s"} tracked
            </span>
          </div>
        ) : null}
      </div>
    </Link>
  );
}

function TargetPortfolioTile({ meta }: { meta: CardMeta }) {
  const Icon = meta.icon;
  const targets = useTargetPortfolios();
  const activeTarget = useActiveTargetPortfolio();
  const hasData = (targets?.length ?? 0) > 0;
  const stockCount = activeTarget?.allocations.length ?? 0;
  const targetName = activeTarget?.name;

  return (
    <Link
      href={meta.href ?? "#"}
      className={cn(
        "group relative flex h-full flex-col gap-3 overflow-hidden p-5 glass",
        "transition-transform duration-300 hover:-translate-y-0.5 hover:border-amber-400/30",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-radial blur-2xl opacity-70",
          "bg-gradient-to-br",
          meta.tint,
        )}
      />
      <div className="relative flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
          <Icon className="h-5 w-5 text-amber-300/90" />
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200 transition-transform group-hover:translate-x-0.5">
          Explore
          <ArrowUpRight className="h-3 w-3" />
        </span>
      </div>
      <div className="relative mt-auto flex flex-col gap-1.5">
        <div className="font-display text-lg font-semibold">{meta.title}</div>
        <div className="text-sm text-muted-foreground">{meta.subtitle}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          {hasData && stockCount > 0 ? (
            <>
              <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5">
                {stockCount} target stock{stockCount === 1 ? "" : "s"}
              </span>
              {targetName && (
                <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 truncate max-w-[140px]">
                  {targetName}
                </span>
              )}
            </>
          ) : (
            <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5">
              Not set up
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

const TOOL_CHIPS = [
  "Dividends",
  "Goal",
  "SIP",
  "Tax",
  "Corp actions",
  "Backup",
];

function PortfolioToolsTile({ meta }: { meta: CardMeta }) {
  const Icon = meta.icon;
  return (
    <Link
      href={meta.href ?? "#"}
      className={cn(
        "group relative flex h-full flex-col gap-3 overflow-hidden p-5 glass",
        "transition-transform duration-300 hover:-translate-y-0.5 hover:border-emerald-300/30",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-radial blur-2xl opacity-70",
          "bg-gradient-to-br",
          meta.tint,
        )}
      />
      <div className="relative flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
          <Icon className="h-5 w-5 text-emerald-200/90" />
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/30 bg-emerald-400/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-200 transition-transform group-hover:translate-x-0.5">
          Explore
          <ArrowUpRight className="h-3 w-3" />
        </span>
      </div>
      <div className="relative mt-auto flex flex-col gap-1.5">
        <div className="font-display text-lg font-semibold">{meta.title}</div>
        <div className="text-sm text-muted-foreground">{meta.subtitle}</div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          {TOOL_CHIPS.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

function OpportunityFinderTile({ meta }: { meta: CardMeta }) {
  const Icon = meta.icon;
  return (
    <Link
      href={meta.href ?? "#"}
      className={cn(
        "group relative flex h-full flex-col gap-3 overflow-hidden p-5 glass",
        "transition-transform duration-300 hover:-translate-y-0.5 hover:border-violet-400/30",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-radial blur-2xl opacity-70",
          "bg-gradient-to-br",
          meta.tint,
        )}
      />
      <div className="relative flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
          <Icon className="h-5 w-5 text-violet-300/90" />
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/30 bg-violet-500/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-200 transition-transform group-hover:translate-x-0.5">
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
