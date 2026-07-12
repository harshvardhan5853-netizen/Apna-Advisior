"use client";

import * as React from "react";
import {
  Building2,
  Tag,
  Layers,
  Wallet,
  TrendingUp,
  TrendingDown,
  BadgeInfo,
  Landmark,
  Info,
  History,
  ShieldAlert,
} from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate, formatINR, formatNumber, formatPct } from "@/lib/utils";
import type { CombinedHolding } from "@/types/portfolio";

interface StockDrawerProps {
  holding: CombinedHolding | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StockDrawer({ holding, open, onOpenChange }: StockDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent width="md">
        {holding ? (
          <>
            <DrawerHeader>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/10 text-emerald-200">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <DrawerTitle className="truncate">{holding.stockName}</DrawerTitle>
                  <DrawerDescription className="mt-1 flex flex-wrap items-center gap-2">
                    {holding.symbol && (
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {holding.symbol}
                      </Badge>
                    )}
                    {holding.exchange !== "UNKNOWN" && (
                      <Badge variant="secondary" className="text-[10px]">{holding.exchange}</Badge>
                    )}
                    {holding.needsReview && (
                      <Badge variant="warning" className="text-[10px]">
                        <ShieldAlert className="mr-1 h-3 w-3" /> Needs review
                      </Badge>
                    )}
                  </DrawerDescription>
                </div>
              </div>
            </DrawerHeader>
            <DrawerBody>
              <PnlBanner holding={holding} />
              <BasicSection holding={holding} />
              <PositionSection holding={holding} />
              <PerformanceSection holding={holding} />
              <SourcesSection holding={holding} />
              <EnrichmentSection holding={holding} />
            </DrawerBody>
          </>
        ) : (
          <DrawerHeader>
            <DrawerTitle>No holding selected</DrawerTitle>
          </DrawerHeader>
        )}
      </DrawerContent>
    </Drawer>
  );
}

function PnlBanner({ holding }: { holding: CombinedHolding }) {
  const positive = holding.pnl >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-4",
        positive
          ? "border-emerald-400/30 bg-emerald-500/[0.08]"
          : "border-red-400/30 bg-red-500/[0.06]",
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl",
          positive ? "bg-emerald-400/20" : "bg-red-400/15",
        )}
      />
      <div className="relative flex items-center justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Total P&L
          </div>
          <div
            className={cn(
              "money-tabular font-display text-2xl font-semibold",
              positive ? "text-emerald-300" : "text-red-400",
            )}
          >
            {formatINR(holding.pnl)}
          </div>
          <div className={cn("text-xs", positive ? "text-emerald-300/80" : "text-red-400/80")}>
            {formatPct(holding.pnlPercent)}
          </div>
        </div>
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-2xl border",
            positive ? "border-emerald-400/40 text-emerald-300" : "border-red-400/40 text-red-400",
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
      </div>
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02]">{children}</div>
    </div>
  );
}

function StatRow({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.04] px-3 py-2 last:border-b-0">
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        {hint && <div className="text-[10px] text-muted-foreground/70">{hint}</div>}
      </div>
      <div className={cn("money-tabular text-sm text-foreground", className)}>{value}</div>
    </div>
  );
}

function BasicSection({ holding }: { holding: CombinedHolding }) {
  return (
    <Section icon={<Info className="h-3.5 w-3.5" />} title="Basic info">
      <StatRow label="Stock name" value={holding.stockName} />
      <StatRow label="Symbol" value={holding.symbol || "—"} />
      <StatRow label="Exchange" value={holding.exchange} />
      <StatRow label="Sector" value={holding.sector ?? "—"} />
      <StatRow label="Industry" value={holding.industry ?? "—"} />
      <StatRow label="Market cap" value={holding.marketCap ?? "Unknown"} />
    </Section>
  );
}

function PositionSection({ holding }: { holding: CombinedHolding }) {
  return (
    <Section icon={<Wallet className="h-3.5 w-3.5" />} title="Position">
      <StatRow label="Quantity" value={formatNumber(holding.quantity)} />
      <StatRow label="Avg buy price" value={formatINR(holding.avgBuyPrice, true)} />
      <StatRow label="Current price" value={formatINR(holding.currentPrice, true)} />
      <StatRow label="Invested" value={formatINR(holding.investedAmount)} />
      <StatRow label="Current value" value={formatINR(holding.currentValue)} />
      <StatRow
        label="Allocation"
        value={holding.allocationPercent.toFixed(2) + "%"}
        hint="Share of current portfolio value"
      />
    </Section>
  );
}

function PerformanceSection({ holding }: { holding: CombinedHolding }) {
  const positive = holding.pnl >= 0;
  return (
    <Section icon={<TrendingUp className="h-3.5 w-3.5" />} title="Performance">
      <StatRow
        label="Overall P&L"
        value={formatINR(holding.pnl)}
        className={positive ? "text-emerald-300" : "text-red-400"}
      />
      <StatRow
        label="Return %"
        value={formatPct(holding.pnlPercent)}
        className={positive ? "text-emerald-300" : "text-red-400"}
      />
      <StatRow
        label="Today's P&L"
        value={
          holding.dayPnl == null ? (
            <span className="text-[11px] text-muted-foreground">Live prices pending</span>
          ) : (
            formatINR(holding.dayPnl)
          )
        }
      />
      <StatRow
        label="Today %"
        value={
          holding.dayPnlPercent == null ? (
            <span className="text-[11px] text-muted-foreground">—</span>
          ) : (
            formatPct(holding.dayPnlPercent)
          )
        }
      />
      <StatRow
        label="Confidence"
        value={(holding.confidence * 100).toFixed(0) + "%"}
        hint="OCR / parser confidence at import"
      />
    </Section>
  );
}

function SourcesSection({ holding }: { holding: CombinedHolding }) {
  if (holding.sources.length === 0) return null;
  return (
    <Section icon={<History className="h-3.5 w-3.5" />} title={`Portfolio sources · ${holding.sources.length}`}>
      <div className="flex flex-col gap-2 p-3">
        {holding.sources.map((s, i) => (
          <div
            key={i}
            className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-3 text-xs"
          >
            <div className="mb-1 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <Layers className="h-3.5 w-3.5 text-emerald-300" />
                <span className="truncate">{s.portfolioName}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">{formatDate(s.dateImported)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
              <div>
                <div className="text-[9px] uppercase tracking-wider">Qty</div>
                <div className="text-foreground money-tabular">{formatNumber(s.quantity)}</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider">Avg</div>
                <div className="text-foreground money-tabular">{formatINR(s.avgBuyPrice, true)}</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider">Invested</div>
                <div className="text-foreground money-tabular">{formatINR(s.investedAmount)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function EnrichmentSection({ holding }: { holding: CombinedHolding }) {
  const hasFundamentals = holding.fundamentals && Object.values(holding.fundamentals).some((v) => v != null);
  const hasTechnical = holding.technical && Object.values(holding.technical).some((v) => v != null);
  const hasRisk = holding.risk && Object.values(holding.risk).some((v) => v != null);
  if (hasFundamentals || hasTechnical || hasRisk) {
    return (
      <Section icon={<BadgeInfo className="h-3.5 w-3.5" />} title="Enrichment">
        {hasFundamentals && holding.fundamentals && (
          <div className="border-b border-white/[0.04] p-3">
            <div className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              <Landmark className="h-3 w-3" /> Fundamentals
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              {Object.entries(holding.fundamentals).map(([k, v]) => (
                <MiniStat key={k} label={k} value={v == null ? "—" : String(v)} />
              ))}
            </div>
          </div>
        )}
      </Section>
    );
  }
  return (
    <Section icon={<BadgeInfo className="h-3.5 w-3.5" />} title="Enrichment">
      <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
        <Tag className="h-3.5 w-3.5 text-emerald-300" />
        <span>Fundamentals, technicals and risk metrics will appear here once enrichment ships.</span>
      </div>
    </Section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/[0.04] bg-white/[0.02] px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-xs text-foreground money-tabular">{value}</div>
    </div>
  );
}
