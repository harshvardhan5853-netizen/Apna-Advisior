"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface LiveSparklineProps {
  values: number[];
  className?: string;
  width?: number;
  height?: number;
  /** Baseline for coloring: values above -> emerald, below -> red. Defaults to first sample. */
  baseline?: number | null;
}

/**
 * Tiny inline SVG sparkline that visualizes today's price movement.
 * No axes, no labels — pure signal.
 */
export function LiveSparkline({
  values,
  className,
  width = 92,
  height = 28,
  baseline,
}: LiveSparklineProps) {
  const points = React.useMemo(() => {
    if (!values || values.length < 2) return null;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const stepX = width / (values.length - 1);
    return values.map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * height;
      return { x, y };
    });
  }, [values, width, height]);

  if (!points) {
    return (
      <div
        className={cn("inline-flex items-center justify-center text-[10px] text-muted-foreground/60", className)}
        style={{ width, height }}
      >
        —
      </div>
    );
  }

  const first = values[0];
  const last = values[values.length - 1];
  const ref = baseline ?? first;
  const up = last >= ref;
  const stroke = up ? "#34d399" : "#f87171";
  const fill = up ? "rgba(52,211,153,0.18)" : "rgba(248,113,113,0.18)";

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("inline-block overflow-visible", className)}
      role="img"
      aria-hidden
    >
      <path d={areaPath} fill={fill} />
      <path d={linePath} fill="none" stroke={stroke} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={2} fill={stroke} />
    </svg>
  );
}
