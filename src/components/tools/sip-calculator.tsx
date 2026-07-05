"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Repeat, TrendingUp, Wallet, PiggyBank } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn, formatCompactINR, formatINR, formatPct } from "@/lib/utils";

interface SipRow {
  year: number;
  monthlySip: number;
  yearContribution: number;
  cumulativeContribution: number;
  endingValue: number;
  growth: number;
}

interface SipProjection {
  months: number;
  totalContribution: number;
  futureValue: number;
  growth: number;
  lumpsumEquivalentFV: number;
  rows: SipRow[];
}

function computeSip(monthlySip: number, annualReturnPct: number, years: number, stepUpPct: number): SipProjection {
  const months = Math.max(0, Math.round(years * 12));
  const r = annualReturnPct / 100 / 12;
  const rows: SipRow[] = [];
  let currentSip = monthlySip;
  let balance = 0;
  let totalContribution = 0;
  for (let year = 1; year <= Math.ceil(years); year += 1) {
    const monthsThisYear = Math.min(12, Math.max(0, months - (year - 1) * 12));
    let yearContribution = 0;
    for (let m = 0; m < monthsThisYear; m += 1) {
      balance = balance * (1 + r) + currentSip;
      yearContribution += currentSip;
    }
    totalContribution += yearContribution;
    rows.push({
      year,
      monthlySip: currentSip,
      yearContribution,
      cumulativeContribution: totalContribution,
      endingValue: balance,
      growth: balance - totalContribution,
    });
    currentSip = currentSip * (1 + stepUpPct / 100);
  }
  // Lumpsum equivalent: if you had invested totalContribution at year 0 at same annual rate.
  const lumpsumEquivalentFV = totalContribution * Math.pow(1 + annualReturnPct / 100, years);
  return {
    months,
    totalContribution,
    futureValue: balance,
    growth: balance - totalContribution,
    lumpsumEquivalentFV,
    rows,
  };
}

export function SipCalculator() {
  const [monthly, setMonthly] = React.useState(10_000);
  const [returnPct, setReturnPct] = React.useState(12);
  const [years, setYears] = React.useState(15);
  const [stepUp, setStepUp] = React.useState(0);

  const projection = React.useMemo(
    () => computeSip(monthly, returnPct, years, stepUp),
    [monthly, returnPct, years, stepUp],
  );

  return (
    <div className="flex flex-col gap-6">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-xl"
      >
        <header className="mb-5 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl border border-cyan-400/30 bg-cyan-500/[0.12]">
            <Repeat className="h-4 w-4 text-cyan-200" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Inputs</h2>
            <p className="text-xs text-muted-foreground">Monthly SIP, expected return, tenure & annual step-up.</p>
          </div>
        </header>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <NumberField label="Monthly SIP (₹)" value={monthly} onChange={setMonthly} min={0} step={500} />
          <NumberField label="Expected return (% p.a.)" value={returnPct} onChange={setReturnPct} min={0} step={0.5} />
          <NumberField label="Tenure (years)" value={years} onChange={setYears} min={1} step={1} />
          <NumberField label="Annual step-up (%)" value={stepUp} onChange={setStepUp} min={0} step={1} />
        </div>
      </motion.section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Future value" value={formatCompactINR(projection.futureValue)} sub={formatINR(projection.futureValue)} tone="gain" icon={TrendingUp} />
        <Tile label="Total invested" value={formatCompactINR(projection.totalContribution)} sub={`${projection.months} monthly SIPs`} tone="muted" icon={Wallet} />
        <Tile label="Wealth gained" value={formatCompactINR(projection.growth)} sub={`Growth / invested: ${formatPct(projection.growth / Math.max(1, projection.totalContribution))}`} tone="gain" icon={PiggyBank} />
        <Tile label="Lumpsum equivalent" value={formatCompactINR(projection.lumpsumEquivalentFV)} sub="If same total ₹ invested at t=0" tone="muted" icon={TrendingUp} />
      </section>

      <section className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-xl">
        <header className="mb-4">
          <h2 className="text-base font-semibold text-foreground">Year-by-year breakdown</h2>
          <p className="text-xs text-muted-foreground">
            Step-up is applied at the start of every new year; growth compounds monthly at the specified rate.
          </p>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-white/[0.05]">
                <th className="py-2 pr-4">Year</th>
                <th className="py-2 pr-4">Monthly SIP</th>
                <th className="py-2 pr-4">Contribution</th>
                <th className="py-2 pr-4">Cumulative</th>
                <th className="py-2 pr-4">Ending value</th>
                <th className="py-2 pr-4">Wealth gained</th>
              </tr>
            </thead>
            <tbody>
              {projection.rows.map((row) => (
                <tr key={row.year} className="border-b border-white/[0.03]">
                  <td className="py-2 pr-4 text-foreground">{row.year}</td>
                  <td className="py-2 pr-4 text-foreground">{formatINR(row.monthlySip)}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{formatINR(row.yearContribution)}</td>
                  <td className="py-2 pr-4 text-muted-foreground">{formatINR(row.cumulativeContribution)}</td>
                  <td className="py-2 pr-4 text-foreground">{formatINR(row.endingValue)}</td>
                  <td className="py-2 pr-4 text-emerald-200">{formatINR(row.growth)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
