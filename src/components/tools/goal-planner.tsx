"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Target, Wallet, PiggyBank, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn, formatCompactINR, formatINR, formatPct } from "@/lib/utils";

interface GoalPlan {
  monthlySipRequired: number;
  totalContribution: number;
  growth: number;
  lumpsumRequired: number;
  months: number;
}

function computeGoal(targetCorpus: number, years: number, annualReturnPct: number): GoalPlan {
  const months = Math.max(0, Math.round(years * 12));
  const r = annualReturnPct / 100 / 12;
  let monthlySip = 0;
  if (months > 0 && targetCorpus > 0) {
    if (r === 0) {
      monthlySip = targetCorpus / months;
    } else {
      // FV = M * ((1+r)^n - 1)/r * (1+r); solve for M.
      const factor = ((Math.pow(1 + r, months) - 1) / r) * (1 + r);
      monthlySip = factor > 0 ? targetCorpus / factor : 0;
    }
  }
  const totalContribution = monthlySip * months;
  const growth = Math.max(0, targetCorpus - totalContribution);
  // Lumpsum needed today to reach target at the same rate.
  const lumpsumRequired = annualReturnPct === 0 ? targetCorpus : targetCorpus / Math.pow(1 + annualReturnPct / 100, years);
  return { monthlySipRequired: monthlySip, totalContribution, growth, lumpsumRequired, months };
}

export function GoalPlanner() {
  const [target, setTarget] = React.useState(10_000_000);
  const [years, setYears] = React.useState(15);
  const [returnPct, setReturnPct] = React.useState(12);

  const plan = React.useMemo(() => computeGoal(target, years, returnPct), [target, years, returnPct]);
  const contribPct = plan.totalContribution / Math.max(1, target);
  const growthPct = 1 - contribPct;

  return (
    <div className="flex flex-col gap-6">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-xl"
      >
        <header className="mb-5 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl border border-emerald-400/30 bg-emerald-500/[0.12]">
            <Target className="h-4 w-4 text-emerald-200" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Goal inputs</h2>
            <p className="text-xs text-muted-foreground">
              Pick a corpus, horizon and expected return — we&apos;ll solve for the monthly SIP you need.
            </p>
          </div>
        </header>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <NumberField label="Target corpus (₹)" value={target} onChange={setTarget} min={0} step={100000} />
          <NumberField label="Horizon (years)" value={years} onChange={setYears} min={1} step={1} />
          <NumberField label="Expected return (% p.a.)" value={returnPct} onChange={setReturnPct} min={0} step={0.5} />
        </div>
      </motion.section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Monthly SIP required" value={formatCompactINR(plan.monthlySipRequired)} sub={formatINR(plan.monthlySipRequired)} tone="gain" icon={Target} />
        <Tile label="Total contribution" value={formatCompactINR(plan.totalContribution)} sub={`${plan.months} months`} tone="muted" icon={Wallet} />
        <Tile label="Growth component" value={formatCompactINR(plan.growth)} sub={`${formatPct(growthPct)} of target`} tone="gain" icon={TrendingUp} />
        <Tile label="Lumpsum today" value={formatCompactINR(plan.lumpsumRequired)} sub="Same corpus if invested now" tone="muted" icon={PiggyBank} />
      </section>

      <section className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-xl">
        <header className="mb-4">
          <h2 className="text-base font-semibold text-foreground">Contribution vs growth</h2>
          <p className="text-xs text-muted-foreground">How much of the target comes from your money vs compounding.</p>
        </header>
        <div className="flex h-3 w-full overflow-hidden rounded-full border border-white/10">
          <div className="h-full bg-emerald-500/60" style={{ width: `${Math.max(0, Math.min(100, contribPct * 100))}%` }} />
          <div className="h-full bg-fuchsia-500/60" style={{ width: `${Math.max(0, Math.min(100, growthPct * 100))}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500/60" /> Your contribution — {formatPct(contribPct)}
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-fuchsia-500/60" /> Growth from compounding — {formatPct(growthPct)}
          </span>
        </div>
      </section>
    </div>
  );
}

function NumberField({ label, value, onChange, min, step }: { label: string; value: number; onChange: (n: number) => void; min?: number; step?: number }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <Input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        step={step}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          onChange(Number.isFinite(n) ? n : 0);
        }}
      />
    </label>
  );
}

function Tile({ label, value, sub, tone, icon: Icon }: { label: string; value: string; sub: string; tone: "gain" | "loss" | "muted"; icon: React.ComponentType<{ className?: string }> }) {
  const toneClass = tone === "gain" ? "text-emerald-200" : tone === "loss" ? "text-rose-200" : "text-foreground";
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className={cn("mt-2 text-xl font-semibold money-tabular", toneClass)}>{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}
