"use client";

import * as React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";
import { cn, formatCompactINR, formatINR } from "@/lib/utils";
import { PIE_COLORS } from "@/lib/analytics";
import type { TargetGapRow } from "@/types/target-portfolio";

interface TargetChartsProps {
  rows: TargetGapRow[];
  totalCapital: number;
  className?: string;
}

export function TargetCharts({ rows, totalCapital, className }: TargetChartsProps) {
  const targetSlices = React.useMemo(() => sliceForPie(rows, "target", totalCapital), [rows, totalCapital]);
  const currentSlices = React.useMemo(() => sliceForPie(rows, "current", totalCapital), [rows, totalCapital]);
  const gapData = React.useMemo(() => buildGapData(rows), [rows]);

  return (
    <div className={cn("grid gap-4 lg:grid-cols-3", className)}>
      <ChartCard title="Target allocation" subtitle="Your ideal mix">
        <PieBlock data={targetSlices} totalCapital={totalCapital} valueLabel="Target" />
      </ChartCard>
      <ChartCard title="Current allocation" subtitle="How you actually hold today">
        <PieBlock data={currentSlices} totalCapital={totalCapital} valueLabel="Current" />
      </ChartCard>
      <ChartCard title="Gap analysis" subtitle="Diff % vs target (green = over, amber = under)">
        <GapBar data={gapData} />
      </ChartCard>
    </div>
  );
}

interface BeforeAfterChartProps {
  rows: TargetGapRow[];
  className?: string;
}

export function BeforeAfterChart({ rows, className }: BeforeAfterChartProps) {
  const data = React.useMemo(() => buildBeforeAfterData(rows), [rows]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn("glass relative overflow-hidden p-5", className)}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="relative mb-3 flex flex-col gap-0.5">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Before vs after rebalancing</div>
        <div className="font-display text-sm font-semibold">
          Your current mix (amber) compared with the target mix (emerald)
        </div>
      </div>
      <div className="relative h-[320px] w-full">
        {data.length === 0 ? (
          <EmptyMsg label="Add allocations to see the comparison." />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                stroke="rgba(255,255,255,0.4)"
                tick={{ fontSize: 10 }}
                interval={0}
                angle={-30}
                textAnchor="end"
                height={60}
              />
              <YAxis
                stroke="rgba(255,255,255,0.4)"
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
              />
              <Tooltip content={(p: unknown) => <BeforeAfterTip p={p as { active?: boolean; payload?: Array<{ payload?: BeforeAfterDatum }> }} />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="current" name="Current %" fill="#fbbf24" fillOpacity={0.85} radius={[4, 4, 0, 0]} />
              <Bar dataKey="target" name="Target %" fill="#34d399" fillOpacity={0.9} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  );
}

interface BeforeAfterDatum {
  key: string;
  name: string;
  current: number;
  target: number;
}

function buildBeforeAfterData(rows: TargetGapRow[]): BeforeAfterDatum[] {
  return rows
    .filter((r) => r.targetPercent > 0 || r.currentPercent > 0.1)
    .sort((a, b) => b.targetPercent - a.targetPercent || b.currentPercent - a.currentPercent)
    .slice(0, 12)
    .map((r) => ({
      key: r.allocationId,
      name: r.symbol || r.stockName,
      current: Number(r.currentPercent.toFixed(2)),
      target: Number(r.targetPercent.toFixed(2)),
    }));
}

function BeforeAfterTip({ p }: { p: { active?: boolean; payload?: Array<{ payload?: BeforeAfterDatum }> } }) {
  if (!p.active || !p.payload?.length) return null;
  const d = p.payload[0]?.payload as BeforeAfterDatum | undefined;
  if (!d) return null;
  const diff = d.current - d.target;
  return (
    <div className="rounded-lg border border-white/10 bg-[hsl(158_28%_10%)]/95 p-3 text-xs backdrop-blur-md">
      <div className="font-semibold">{d.name}</div>
      <div className="text-amber-200">Current: {d.current.toFixed(2)}%</div>
      <div className="text-emerald-300">Target: {d.target.toFixed(2)}%</div>
      <div className={diff >= 0 ? "text-red-300" : "text-amber-200"}>
        Diff: {diff > 0 ? "+" : ""}
        {diff.toFixed(2)}%
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="glass relative overflow-hidden p-5"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="relative mb-3 flex flex-col gap-0.5">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{title}</div>
        <div className="font-display text-sm font-semibold">{subtitle}</div>
      </div>
      <div className="relative h-[280px] w-full">{children}</div>
    </motion.div>
  );
}

interface Slice {
  key: string;
  name: string;
  value: number;
  percent: number;
  color: string;
}

function sliceForPie(rows: TargetGapRow[], kind: "target" | "current", totalCapital: number): Slice[] {
  const source =
    kind === "target"
      ? rows.filter((r) => r.targetPercent > 0)
      : rows.filter((r) => r.currentValue > 0);
  const raw = source.map((r, i) => {
    const value = kind === "target" ? r.targetValue : r.currentValue;
    const percent = kind === "target" ? r.targetPercent : r.currentPercent;
    return {
      key: r.allocationId,
      name: r.symbol || r.stockName,
      value,
      percent,
      color: PIE_COLORS[i % PIE_COLORS.length],
    };
  });
  // Cap at 10 slices then group "Others".
  if (raw.length <= 10) return raw;
  const top = raw.slice(0, 10);
  const rest = raw.slice(10);
  const restValue = rest.reduce((s, r) => s + r.value, 0);
  const restPct = rest.reduce((s, r) => s + r.percent, 0);
  top.push({
    key: "others",
    name: `Others (${rest.length})`,
    value: restValue,
    percent: restPct,
    color: "#475569",
  });
  void totalCapital;
  return top;
}

function PieBlock({ data, totalCapital, valueLabel }: { data: Slice[]; totalCapital: number; valueLabel: string }) {
  if (data.length === 0) {
    return <EmptyMsg label="Nothing to show — add allocations first." />;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={95}
          paddingAngle={1}
          stroke="rgba(0,0,0,0.35)"
          labelLine={false}
          label={(entry) => renderSliceLabel(entry as unknown as Slice)}
        >
          {data.map((entry) => (
            <Cell key={entry.key} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={(p: unknown) => <SliceTip p={p as { active?: boolean; payload?: Array<{ payload?: Slice }> }} label={valueLabel} totalCapital={totalCapital} />} />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          wrapperStyle={{ fontSize: 11 }}
          formatter={(v) => (typeof v === "string" && v.length > 16 ? `${v.slice(0, 16)}…` : v)}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function renderSliceLabel(entry: Slice) {
  if (entry.percent < 5) return null;
  return `${entry.name} ${entry.percent.toFixed(1)}%`;
}

function SliceTip({
  p,
  label,
  totalCapital,
}: {
  p: { active?: boolean; payload?: Array<{ payload?: Slice }> };
  label: string;
  totalCapital: number;
}) {
  if (!p.active || !p.payload?.length) return null;
  const s = p.payload[0]?.payload as Slice | undefined;
  if (!s) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[hsl(158_28%_10%)]/95 p-3 text-xs backdrop-blur-md">
      <div className="font-semibold">{s.name}</div>
      <div className="text-muted-foreground">{label}: {formatINR(s.value)}</div>
      <div className="text-emerald-300">{s.percent.toFixed(2)}% of {formatCompactINR(totalCapital)}</div>
    </div>
  );
}

interface GapDatum {
  key: string;
  name: string;
  diff: number;
  target: number;
  color: string;
}

function buildGapData(rows: TargetGapRow[]): GapDatum[] {
  return rows
    .filter((r) => r.targetPercent > 0 || Math.abs(r.diffPercent) > 0.5)
    .sort((a, b) => Math.abs(b.diffPercent) - Math.abs(a.diffPercent))
    .slice(0, 12)
    .map((r) => ({
      key: r.allocationId,
      name: r.symbol,
      diff: Number(r.diffPercent.toFixed(2)),
      target: r.targetPercent,
      color: r.diffPercent >= 0 ? "#f87171" : "#fbbf24",
    }));
}

function GapBar({ data }: { data: GapDatum[] }) {
  if (data.length === 0) {
    return <EmptyMsg label="Perfectly aligned — nothing to rebalance." />;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 20, bottom: 30, left: 0 }} layout="vertical">
        <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
        <XAxis
          type="number"
          stroke="rgba(255,255,255,0.4)"
          tick={{ fontSize: 10 }}
          tickFormatter={(v) => `${v > 0 ? "+" : ""}${Number(v).toFixed(0)}%`}
        />
        <YAxis
          dataKey="name"
          type="category"
          width={72}
          stroke="rgba(255,255,255,0.4)"
          tick={{ fontSize: 11 }}
        />
        <Tooltip content={(p: unknown) => <GapTip p={p as { active?: boolean; payload?: Array<{ payload?: GapDatum }> }} />} />
        <Bar dataKey="diff" radius={[0, 6, 6, 0]}>
          {data.map((entry) => (
            <Cell key={entry.key} fill={entry.color} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function GapTip({ p }: { p: { active?: boolean; payload?: Array<{ payload?: GapDatum }> } }) {
  if (!p.active || !p.payload?.length) return null;
  const d = p.payload[0]?.payload as GapDatum | undefined;
  if (!d) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[hsl(158_28%_10%)]/95 p-3 text-xs backdrop-blur-md">
      <div className="font-semibold">{d.name}</div>
      <div className="text-muted-foreground">Target: {d.target.toFixed(1)}%</div>
      <div className={d.diff >= 0 ? "text-red-300" : "text-amber-200"}>
        Diff: {d.diff > 0 ? "+" : ""}
        {d.diff.toFixed(2)}%
      </div>
    </div>
  );
}

function EmptyMsg({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/[0.08] text-xs text-muted-foreground">
      {label}
    </div>
  );
}
