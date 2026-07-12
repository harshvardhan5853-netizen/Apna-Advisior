"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompactINR, formatINR, formatPct } from "@/lib/utils";
import type { CombinedHolding } from "@/types/portfolio";
import { computePnlTrend } from "@/lib/analytics";
import { ChartCard, EmptyChart } from "./chart-card";

interface PnlTrendChartProps {
  holdings: CombinedHolding[];
}

export function PnlTrendChart({ holdings }: PnlTrendChartProps) {
  const data = React.useMemo(() => {
    return computePnlTrend(holdings, 15).map((h) => ({
      label: h.symbol || h.stockName.slice(0, 8),
      stockName: h.stockName,
      symbol: h.symbol,
      pnl: h.pnl,
      pnlPercent: h.pnlPercent,
    }));
  }, [holdings]);

  return (
    <ChartCard
      title="P&L trend"
      subtitle="Top 15 holdings by absolute profit or loss"
    >
      {data.length === 0 ? (
        <EmptyChart message="No P&L data yet" />
      ) : (
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="rgba(255,255,255,0.4)"
                tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }}
                tickMargin={8}
                interval={0}
                angle={-30}
                textAnchor="end"
                height={54}
              />
              <YAxis
                stroke="rgba(255,255,255,0.4)"
                tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }}
                tickFormatter={(v: number) => formatCompactINR(v)}
                width={64}
              />
              <Tooltip cursor={{ fill: "rgba(255,255,255,0.03)" }} content={<PnlTooltip />} />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.pnl >= 0 ? "#10b981" : "#ef4444"} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

interface PnlTooltipPayload {
  active?: boolean;
  payload?: Array<{
    payload?: {
      stockName?: string;
      symbol?: string;
      pnl?: number;
      pnlPercent?: number;
    };
  }>;
}

function PnlTooltip({ active, payload }: PnlTooltipPayload) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const pnl = row.pnl ?? 0;
  return (
    <div className="rounded-xl border border-white/10 bg-[hsl(158_28%_10%)]/95 px-3 py-2 text-xs shadow-glass backdrop-blur-xl">
      <div className="mb-0.5 font-medium text-foreground">{row.stockName ?? ""}</div>
      {row.symbol && (
        <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">{row.symbol}</div>
      )}
      <div className={"money-tabular text-sm " + (pnl >= 0 ? "text-emerald-300" : "text-red-400")}>
        {formatINR(pnl)}
      </div>
      {typeof row.pnlPercent === "number" && (
        <div className="text-[11px] text-muted-foreground">{formatPct(row.pnlPercent)}</div>
      )}
    </div>
  );
}
