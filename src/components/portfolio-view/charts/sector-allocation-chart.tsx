"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { PIE_COLORS } from "@/lib/analytics";
import { formatCompactINR, formatINR, formatPct } from "@/lib/utils";
import type { SectorAllocation } from "@/types/portfolio";
import { ChartCard, EmptyChart } from "./chart-card";

interface SectorAllocationChartProps {
  data: SectorAllocation[];
}

export function SectorAllocationChart({ data }: SectorAllocationChartProps) {
  const totalCurrent = React.useMemo(
    () => data.reduce((s, r) => s + r.currentValue, 0),
    [data],
  );

  const chartData = React.useMemo(() => {
    return data.map((row, i) => ({
      ...row,
      color: PIE_COLORS[i % PIE_COLORS.length],
      allocationPercent: totalCurrent > 0 ? (row.currentValue / totalCurrent) * 100 : 0,
    }));
  }, [data, totalCurrent]);

  const height = Math.max(240, chartData.length * 44);

  return (
    <ChartCard
      title="Sector allocation"
      subtitle="Current value distributed across sectors"
    >
      {chartData.length === 0 ? (
        <EmptyChart message="No sector data yet" />
      ) : (
        <div className="w-full" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 8, right: 24, left: 0, bottom: 0 }}
            >
              <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis
                type="number"
                stroke="rgba(255,255,255,0.4)"
                tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }}
                tickFormatter={(v: number) => formatCompactINR(v)}
              />
              <YAxis
                dataKey="sector"
                type="category"
                stroke="rgba(255,255,255,0.4)"
                tick={{ fontSize: 11, fill: "rgba(255,255,255,0.75)" }}
                width={130}
              />
              <Tooltip cursor={{ fill: "rgba(255,255,255,0.03)" }} content={<SectorTooltip />} />
              <Bar dataKey="currentValue" radius={[0, 8, 8, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

interface SectorTooltipPayload {
  active?: boolean;
  payload?: Array<{
    payload?: SectorAllocation & { allocationPercent?: number };
  }>;
}

function SectorTooltip({ active, payload }: SectorTooltipPayload) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[hsl(158_28%_10%)]/95 px-3 py-2 text-xs shadow-glass backdrop-blur-xl">
      <div className="mb-1 font-medium text-foreground">{row.sector}</div>
      <div className="grid gap-0.5 money-tabular">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Current</span>
          <span>{formatINR(row.currentValue)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Invested</span>
          <span>{formatINR(row.invested)}</span>
        </div>
        <div className={"flex items-center justify-between gap-4 " + (row.pnl >= 0 ? "text-emerald-300" : "text-red-400")}>
          <span>P&L</span>
          <span>{formatINR(row.pnl)} · {formatPct(row.pnlPercent)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Stocks</span>
          <span>{row.count}</span>
        </div>
        {typeof row.allocationPercent === "number" && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Weight</span>
            <span>{row.allocationPercent.toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
