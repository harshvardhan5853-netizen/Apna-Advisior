"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { IndianRupee, ShieldCheck, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn, formatINR, formatPct } from "@/lib/utils";

// Tax rates per Budget 2024 (post-23-Jul-2024) for listed equity + equity mutual funds.
const STCG_RATE = 0.20; // 20% on short-term gains (holding <= 12 months).
const LTCG_RATE = 0.125; // 12.5% on long-term gains (holding > 12 months).
const LTCG_EXEMPTION = 125_000; // First ₹1,25,000 of LTCG per financial year is exempt.
const CESS_RATE = 0.04; // Health + Education cess on the tax amount.

type TaxKind = "stcg" | "ltcg";

interface TaxBreakdown {
  gross: number;
  exempt: number;
  taxable: number;
  baseTax: number;
  cess: number;
  totalTax: number;
  netGain: number;
  effectiveRate: number;
}

function computeTax(kind: TaxKind, gain: number): TaxBreakdown {
  const gross = Math.max(0, gain);
  const exempt = kind === "ltcg" ? Math.min(gross, LTCG_EXEMPTION) : 0;
  const taxable = Math.max(0, gross - exempt);
  const rate = kind === "stcg" ? STCG_RATE : LTCG_RATE;
  const baseTax = taxable * rate;
  const cess = baseTax * CESS_RATE;
  const totalTax = baseTax + cess;
  const netGain = gross - totalTax;
  return {
    gross,
    exempt,
    taxable,
    baseTax,
    cess,
    totalTax,
    netGain,
    effectiveRate: gross > 0 ? totalTax / gross : 0,
  };
}

export function TaxCalculator() {
  const [kind, setKind] = React.useState<TaxKind>("ltcg");
  const [gain, setGain] = React.useState(500_000);

  const breakdown = React.useMemo(() => computeTax(kind, gain), [kind, gain]);

  return (
    <div className="flex flex-col gap-6">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-xl"
      >
        <header className="mb-5 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl border border-rose-400/30 bg-rose-500/[0.12]">
            <IndianRupee className="h-4 w-4 text-rose-200" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Realized gains</h2>
            <p className="text-xs text-muted-foreground">Pick holding period, enter net realized gains for the FY.</p>
          </div>
        </header>

        <div role="tablist" aria-label="Holding period" className="mb-4 inline-flex gap-1 rounded-full border border-white/[0.06] bg-white/[0.02] p-1">
          {(["stcg", "ltcg"] as TaxKind[]).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={kind === k}
              onClick={() => setKind(k)}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs uppercase tracking-wider transition-colors",
                kind === k
                  ? "bg-rose-500/[0.16] text-rose-100 shadow-glow-rose"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {k === "stcg" ? "STCG · ≤12m" : "LTCG · >12m"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Realized gains (₹)</span>
            <Input
              type="number"
              value={Number.isFinite(gain) ? gain : 0}
              min={0}
              step={10000}
              onChange={(e) => {
                const n = parseFloat(e.target.value);
                setGain(Number.isFinite(n) ? n : 0);
              }}
            />
          </label>
          <div className="flex items-end">
            <p className="text-xs text-muted-foreground">
              Rate applied: {kind === "stcg" ? "20% flat + 4% cess" : "12.5% above ₹1,25,000 exemption + 4% cess"}.
            </p>
          </div>
        </div>
      </motion.section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Gross gain" value={formatINR(breakdown.gross)} sub={kind === "stcg" ? "Short-term" : "Long-term"} tone="muted" />
        <Tile label="Exempt" value={formatINR(breakdown.exempt)} sub={kind === "ltcg" ? "First ₹1.25L free" : "No exemption for STCG"} tone="gain" />
        <Tile label="Taxable" value={formatINR(breakdown.taxable)} sub={`After exemption`} tone="muted" />
        <Tile label="Total tax" value={formatINR(breakdown.totalTax)} sub={`Effective ${formatPct(breakdown.effectiveRate)}`} tone="loss" />
      </section>

      <section className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-xl">
        <header className="mb-4 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Detailed breakdown</h2>
            <p className="text-xs text-muted-foreground">Line-by-line calculation of the tax outgo.</p>
          </div>
        </header>
        <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
          <Row label="Base tax" value={formatINR(breakdown.baseTax)} sub={`${formatPct(kind === "stcg" ? STCG_RATE : LTCG_RATE)} on taxable amount`} />
          <Row label="Health & Education cess" value={formatINR(breakdown.cess)} sub="4% on base tax" />
          <Row label="Total tax outgo" value={formatINR(breakdown.totalTax)} sub="Base tax + cess" />
          <Row label="Net gain after tax" value={formatINR(breakdown.netGain)} sub={`Effective rate ${formatPct(breakdown.effectiveRate)}`} tone="gain" />
        </dl>
      </section>

      <section className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-xl">
        <header className="mb-3 flex items-center gap-3">
          <Info className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">Rate reference (Budget 2024)</h2>
        </header>
        <ul className="grid gap-2 text-sm text-muted-foreground">
          <li>• STCG on listed equity / equity MF: <span className="text-foreground">20%</span> flat.</li>
          <li>• LTCG on listed equity / equity MF: <span className="text-foreground">12.5%</span> beyond ₹1,25,000 exemption per FY.</li>
          <li>• Health &amp; Education cess: <span className="text-foreground">4%</span> on the tax amount.</li>
          <li>• Holding period: STCG ≤ 12 months, LTCG &gt; 12 months (listed equity).</li>
          <li>• This tool is illustrative — surcharge for very high incomes and set-off with prior-year losses are not modelled.</li>
        </ul>
      </section>
    </div>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: "gain" | "loss" | "muted" }) {
  const toneClass = tone === "gain" ? "text-emerald-200" : tone === "loss" ? "text-rose-200" : "text-foreground";
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 backdrop-blur-xl">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-2 text-xl font-semibold money-tabular", toneClass)}>{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function Row({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "gain" }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <div className="flex items-center justify-between">
        <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
        <dd className={cn("text-sm font-medium money-tabular", tone === "gain" ? "text-emerald-200" : "text-foreground")}>{value}</dd>
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}
