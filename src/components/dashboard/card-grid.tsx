"use client";

import { motion } from "framer-motion";
import { Bot, Newspaper, Sparkles, Table2, Target, Wallet, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { PortfolioCard } from "@/components/portfolio/portfolio-card";
import {
  CardMeta,
  ViewPortfolioTile,
  NewsTile,
  TargetPortfolioTile,
  PortfolioToolsTile,
  OpportunityFinderTile,
  AiChatBotTile,
} from "./card-tiles";

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
          ) : c.id === "ai-chat-bot" ? (
            <AiChatBotTile meta={c} />
          ) : null}
        </motion.div>
      ))}
    </section>
  );
}
