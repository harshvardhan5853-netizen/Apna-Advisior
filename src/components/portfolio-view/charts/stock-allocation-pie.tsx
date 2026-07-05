"use client";

import * as React from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCompactINR, formatINR } from "@/lib/utils";
import type { StockAllocation } from "@/types/portfolio";
import { ChartCard, EmptyChart } from "./chart-card";

interface StockAllocationPieProps {
  data: StockAllocation[];
}

export function StockAllocationPie({ data }: StockAllocationPieProps) {
  return (
    <ChartCard
      title="Stock allocation"
      subtitle="Weight of each holding in current portfolio value"
    >
      {data.length === 0 ? (
        <EmptyChart message="Add holdings to see allocation" />
      ) : (
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="currentValue"
                nameKey="stockName"
                cx="50%"
                cy="45%"
                innerRadius={55}
                outerRadius={100}
                paddingAngle={1}
                stroke="rgba(0,0,0,0.35)"
                strokeWidth={1}
                labelLine={false}
                label={renderLabel}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}
                formatter={(value: string) => (value.length > 18 ? value.slice(0, 18) + "…" : value)}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

interface RenderLabelArgs {
  cx?: number;
  cy?: number;
  midAngle?: number;
  outerRadius?: number;
  percent?: number;
  payload?: StockAllocation;
}

function renderLabel({ cx, cy, midAngle, outerRadius, percent, payload }: RenderLabelArgs) {
  if (
    cx == null ||
    cy == null ||
    midAngle == null ||
    outerRadius == null ||
    percent == null ||
    !payload ||
    percent < 0.04
  ) {
    return null;
  }
  const RAD = Math.PI / 180;
  const radius = outerRadius + 14;
  const x = cx + radius * Math.cos(-midAngle * RAD);
  const y = cy + radius * Math.sin(-midAngle * RAD);
  const label = payload.symbol || payload.stockName.slice(0, 8);
  return (
    <text
      x={x}
      y={y}
      fill="rgba(255,255,255,0.75)"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={10}
    >
      {label} {(percent * 100).toFixed(1)}%
    </text>
  );
}

interface PieTooltipPayload {
  active?: boolean;
  payload?: Array<{ payload?: StockAllocation }>;
}

function PieTooltip({ active, payload }: PieTooltipPayload) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[hsl(158_28%_10%)]/95 px-3 py-2 text-xs shadow-glass backdrop-blur-xl">
      <div className="mb-0.5 font-medium text-foreground">{row.stockName}</div>
      {row.symbol && <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">{row.symbol}</div>}
      <div className="grid gap-0.5 money-tabular">
        <div className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">Current</span>
          <span>{formatINR(row.currentValue)}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">Weight</span>
          <span>{row.allocationPercent.toFixed(2)}%</span>
        </div>
        <div className="mt-1 text-[10px] text-muted-foreground">{formatCompactINR(row.currentValue)}</div>
      </div>
    </div>
  );
}
