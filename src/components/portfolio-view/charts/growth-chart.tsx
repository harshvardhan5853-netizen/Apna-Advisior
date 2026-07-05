"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompactINR, formatINR } from "@/lib/utils";
import type { CombinedHolding } from "@/types/portfolio";
import { computeGrowthSeries } from "@/lib/analytics";
import { usePortfolioHistory } from "@/hooks/use-portfolio-history";
import { ChartCard, EmptyChart } from "./chart-card";

interface GrowthChartProps {
  holdings: CombinedHolding[];
  invested: number;
}

interface HistoricalPoint {
  label: string;
  invested: number;
  currentValue: number;
}

function formatDayLabel(t: number): string {
  try {
    return new Date(t).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  } catch {
    return "";
  }
}

export function GrowthChart({ holdings, invested }: GrowthChartProps) {
  const { series: historySeries, loading: historyLoading, resolvedCount, missing } = usePortfolioHistory(
    holdings,
    invested,
    holdings.length > 0,
  );

  // Prefer real 1y Yahoo time-series when we resolved at least one holding.
  // Fall back to per-holding cumulative when history isn't ready yet or Yahoo
  // returned nothing (offline, symbol mismatch, delisted, etc.).
  const historical: HistoricalPoint[] | null = React.useMemo(() => {
    if (historySeries.length < 2) return null;
    return historySeries.map((p) => ({
      label: formatDayLabel(p.t),
      invested: p.invested,
      currentValue: p.value,
    }));
  }, [historySeries]);

  const fallback = React.useMemo(() => computeGrowthSeries(holdings), [holdings]);
  const data = historical ?? fallback;

  const usingHistorical = historical !== null;
  const subtitle = usingHistorical
    ? `Real daily portfolio value · Yahoo Finance · last 1y${missing.length > 0 ? ` · ${resolvedCount}/${holdings.length} resolved` : ""}`
    : historyLoading
      ? "Loading real time-series… showing cumulative baseline"
      : "Cumulative invested vs current value across all holdings";

  return (
    <ChartCard
      title="Portfolio growth"
      subtitle={subtitle}
    >
      {data.length === 0 ? (
        <EmptyChart message="Add holdings to see growth" />
      ) : (
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="growth-invested" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5eead4" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#5eead4" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="growth-current" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.85} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="rgba(255,255,255,0.4)"
                tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }}
                tickMargin={8}
                interval="preserveStartEnd"
                minTickGap={12}
              />
              <YAxis
                stroke="rgba(255,255,255,0.4)"
                tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }}
                tickFormatter={(v: number) => formatCompactINR(v)}
                width={64}
              />
              <Tooltip
                cursor={{ stroke: "rgba(16,185,129,0.35)", strokeWidth: 1 }}
                content={<GrowthTooltip />}
              />
              <Area
                type="monotone"
                dataKey="invested"
                stroke="#5eead4"
                strokeWidth={2}
                fill="url(#growth-invested)"
                name="Invested"
              />
              <Area
                type="monotone"
                dataKey="currentValue"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#growth-current)"
                name="Current"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

interface TooltipPayload {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number; payload?: { label?: string } }>;
}

function GrowthTooltip({ active, payload }: TooltipPayload) {
  if (!active || !payload || payload.length === 0) return null;
  const label = payload[0]?.payload?.label ?? "";
  const invested = payload.find((p) => p.dataKey === "invested")?.value ?? 0;
  const currentValue = payload.find((p) => p.dataKey === "currentValue")?.value ?? 0;
  const delta = currentValue - invested;
  return (
    <div className="rounded-xl border border-white/10 bg-[hsl(158_28%_10%)]/95 px-3 py-2 text-xs shadow-glass backdrop-blur-xl">
      <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Up to {label}</div>
      <div className="flex flex-col gap-0.5 money-tabular">
        <div className="flex items-center justify-between gap-4">
          <span className="text-teal-300">Invested</span>
          <span>{formatINR(invested)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-emerald-300">Current</span>
          <span>{formatINR(currentValue)}</span>
        </div>
        <div className={"flex items-center justify-between gap-4 " + (delta >= 0 ? "text-emerald-300" : "text-red-400")}>
          <span>Delta</span>
          <span>{formatINR(delta)}</span>
        </div>
      </div>
    </div>
  );
}
