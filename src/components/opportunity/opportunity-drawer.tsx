"use client";

import { ShieldAlert } from "lucide-react";
import type { OpportunityAnalysis, RiskLevel } from "@/types/opportunity";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn, formatCompactINR, formatINR, formatNumber, formatPct } from "@/lib/utils";
import { RecommendationBadge } from "./recommendation-badge";
import { ValuationPill } from "./valuation-pill";
import { ScoreBar } from "./score-bar";

interface OpportunityDrawerProps {
  analysis: OpportunityAnalysis | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RISK_META: Record<RiskLevel, { label: string; classes: string }> = {
  low: { label: "Low risk", classes: "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200" },
  medium: { label: "Medium risk", classes: "border-amber-400/30 bg-amber-500/[0.10] text-amber-200" },
  high: { label: "High risk", classes: "border-red-400/30 bg-red-500/[0.10] text-red-200" },
  "very-high": { label: "Very high risk", classes: "border-red-500/60 bg-red-500/[0.16] text-red-100" },
};

export function OpportunityDrawer({ analysis, open, onOpenChange }: OpportunityDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent width="lg">
        {analysis && (
          <>
            <DrawerHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <DrawerTitle className="truncate">{analysis.name}</DrawerTitle>
                  <DrawerDescription>
                    <span className="font-mono uppercase">{analysis.symbol}</span>
                    {analysis.sector && ` · ${analysis.sector}`}
                    {analysis.industry && ` · ${analysis.industry}`}
                  </DrawerDescription>
                </div>
                <div className="text-right">
                  <div className="font-display text-2xl font-semibold money-tabular">
                    {analysis.currentPrice != null ? formatINR(analysis.currentPrice, true) : "—"}
                  </div>
                  {analysis.dayChange != null && analysis.dayChangePercent != null && (
                    <div
                      className={cn(
                        "text-xs money-tabular",
                        analysis.dayChange >= 0 ? "text-emerald-300" : "text-red-300",
                      )}
                    >
                      {analysis.dayChange >= 0 ? "+" : ""}
                      {formatINR(analysis.dayChange, true)} ({formatPct(analysis.dayChangePercent)})
                    </div>
                  )}
                </div>
              </div>
            </DrawerHeader>

            <DrawerBody>
              <div className="flex flex-col gap-5">
                {/* Recommendation */}
                <Section title="Recommendation">
                  <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">APNA score</div>
                      <div className="mt-1 font-display text-3xl font-semibold text-emerald-gradient money-tabular">
                        {Math.round(analysis.advisorScore)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <RecommendationBadge recommendation={analysis.recommendation} size="md" />
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        Confidence <span className="text-foreground">{(analysis.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                </Section>

                {/* Valuation */}
                <Section title="Valuation">
                  <div className="flex items-center gap-2">
                    <ValuationPill status={analysis.valuation.status} discountPercent={analysis.valuation.discountPercent} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                    <Stat label="Fair value" value={fmtMoney(analysis.valuation.fairValue)} />
                    <Stat label="DCF" value={fmtMoney(analysis.valuation.dcfValue)} />
                    <Stat label="PE-based" value={fmtMoney(analysis.valuation.peBased)} />
                    <Stat label="PB-based" value={fmtMoney(analysis.valuation.pbBased)} />
                  </div>
                  {analysis.valuation.reasons.length > 0 && (
                    <ul className="mt-3 ml-4 list-disc space-y-1 text-xs text-muted-foreground">
                      {analysis.valuation.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  )}
                </Section>

                {/* Sub-scores */}
                <Section title="Sub-scores">
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <ScoreBar label="Value" score={analysis.scores.value} />
                    <ScoreBar label="Quality" score={analysis.scores.quality} />
                    <ScoreBar label="Growth" score={analysis.scores.growth} />
                    <ScoreBar label="Momentum" score={analysis.scores.momentum} />
                    <ScoreBar label="Health" score={analysis.scores.health} />
                    <ScoreBar label="News" score={analysis.scores.news} />
                  </div>
                </Section>

                {/* Why */}
                <Section title="Why this recommendation">
                  {analysis.reasons.length > 0 ? (
                    <ul className="ml-4 list-disc space-y-1 text-sm">
                      {analysis.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-sm text-muted-foreground">No specific reasons available.</div>
                  )}
                  {analysis.hinglish && (
                    <div className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-500/[0.06] p-3 text-sm italic text-emerald-200">
                      {analysis.hinglish}
                    </div>
                  )}
                </Section>

                {/* Fundamentals */}
                {analysis.fundamentals && (
                  <Section title="Fundamentals">
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                      <Fund label="P/E" value={fmtNum(analysis.fundamentals.pe)} />
                      <Fund label="Forward P/E" value={fmtNum(analysis.fundamentals.forwardPe)} />
                      <Fund label="P/B" value={fmtNum(analysis.fundamentals.pb)} />
                      <Fund label="PEG" value={fmtNum(analysis.fundamentals.peg)} />
                      <Fund label="P/S" value={fmtNum(analysis.fundamentals.ps)} />
                      <Fund label="EV/EBITDA" value={fmtNum(analysis.fundamentals.evEbitda)} />
                      <Fund label="Div yield" value={fmtPct(analysis.fundamentals.divYield)} />
                      <Fund label="Earnings yield" value={fmtPct(analysis.fundamentals.earningsYield)} />
                      <Fund label="EPS" value={fmtNum(analysis.fundamentals.eps)} />
                      <Fund label="Book value" value={fmtNum(analysis.fundamentals.bookValue)} />
                      <Fund label="Market cap" value={fmtCompact(analysis.fundamentals.marketCap)} />
                      <Fund label="ROE" value={fmtPct(analysis.fundamentals.roe)} />
                      <Fund label="ROCE" value={fmtPct(analysis.fundamentals.roce)} />
                      <Fund label="ROA" value={fmtPct(analysis.fundamentals.roa)} />
                      <Fund label="Op margin" value={fmtPct(analysis.fundamentals.opMargin)} />
                      <Fund label="Net margin" value={fmtPct(analysis.fundamentals.netMargin)} />
                      <Fund label="Revenue growth" value={fmtPct(analysis.fundamentals.revenueGrowth)} />
                      <Fund label="Profit growth" value={fmtPct(analysis.fundamentals.profitGrowth)} />
                      <Fund label="EPS growth" value={fmtPct(analysis.fundamentals.epsGrowth)} />
                      <Fund label="D/E" value={fmtNum(analysis.fundamentals.debtEquity)} />
                      <Fund label="Current ratio" value={fmtNum(analysis.fundamentals.currentRatio)} />
                      <Fund label="Interest cov." value={fmtNum(analysis.fundamentals.interestCoverage)} />
                      <Fund label="FCF (Cr)" value={fmtNum(analysis.fundamentals.fcf)} />
                    </div>
                  </Section>
                )}

                {/* Technicals */}
                {analysis.technical && (
                  <Section title="Technicals">
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                      <Fund label="RSI(14)" value={fmtNum(analysis.technical.rsi)} />
                      <Fund label="MACD" value={fmtNum(analysis.technical.macd)} />
                      <Fund label="MACD hist" value={fmtNum(analysis.technical.macdHistogram)} />
                      <Fund label="SMA 20" value={fmtNum(analysis.technical.sma20)} />
                      <Fund label="SMA 50" value={fmtNum(analysis.technical.sma50)} />
                      <Fund label="SMA 200" value={fmtNum(analysis.technical.sma200)} />
                      <Fund label="EMA 20" value={fmtNum(analysis.technical.ema20)} />
                      <Fund label="EMA 50" value={fmtNum(analysis.technical.ema50)} />
                      <Fund label="EMA 200" value={fmtNum(analysis.technical.ema200)} />
                      <Fund label="BB lower" value={fmtNum(analysis.technical.bollingerLower)} />
                      <Fund label="BB upper" value={fmtNum(analysis.technical.bollingerUpper)} />
                      <Fund label="ATR" value={fmtNum(analysis.technical.atr)} />
                      <Fund label="ADX" value={fmtNum(analysis.technical.adx)} />
                      <Fund label="Volume" value={fmtNum(analysis.technical.volume)} />
                      <Fund label="Rel volume" value={fmtNum(analysis.technical.relativeVolume)} />
                      <Fund label="Support" value={fmtNum(analysis.technical.support)} />
                      <Fund label="Resistance" value={fmtNum(analysis.technical.resistance)} />
                      <Fund label="52W high" value={fmtNum(analysis.technical.high52w)} />
                      <Fund label="52W low" value={fmtNum(analysis.technical.low52w)} />
                      <Fund label="Return 1M" value={fmtPct(analysis.technical.return1m)} />
                      <Fund label="Return 3M" value={fmtPct(analysis.technical.return3m)} />
                      <Fund label="Return 6M" value={fmtPct(analysis.technical.return6m)} />
                      <Fund label="Return 1Y" value={fmtPct(analysis.technical.return1y)} />
                      <Fund label="Momentum" value={String(Math.round(analysis.technical.momentumScore))} />
                      <Fund label="Beta (vs NIFTY)" value={fmtNum(analysis.technical.beta)} />
                    </div>
                    <div className="mt-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                      Trend: <span className="text-foreground">{analysis.technical.trend}</span>
                    </div>
                  </Section>
                )}

                {/* Risk */}
                <Section title="Risk">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider",
                        RISK_META[analysis.risk.level].classes,
                      )}
                    >
                      <ShieldAlert className="h-3 w-3" />
                      {RISK_META[analysis.risk.level].label}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                    <Fund label="Volatility" value={fmtPct(analysis.risk.volatility)} />
                    <Fund label="Drawdown" value={fmtPct(analysis.risk.drawdownFromHigh)} />
                    <Fund label="Sector" value={analysis.risk.sectorRisk} />
                    <Fund label="Market cap" value={analysis.risk.marketCapRisk} />
                  </div>
                  {analysis.risk.notes.length > 0 && (
                    <ul className="mt-3 ml-4 list-disc space-y-1 text-xs text-muted-foreground">
                      {analysis.risk.notes.map((n, i) => (
                        <li key={i}>{n}</li>
                      ))}
                    </ul>
                  )}
                </Section>

                {/* Ownership */}
                {analysis.fundamentals && (
                  <Section title="Ownership">
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                      <Fund label="Promoter" value={fmtPct(analysis.fundamentals.promoterHolding)} />
                      <Fund label="FII" value={fmtPct(analysis.fundamentals.fiiHolding)} />
                      <Fund label="DII" value={fmtPct(analysis.fundamentals.diiHolding)} />
                      <Fund label="Public" value={fmtPct(analysis.fundamentals.publicHolding)} />
                    </div>
                    {analysis.fundamentals.promoterPledge != null && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Promoter pledge: <span className="text-foreground">{fmtPct(analysis.fundamentals.promoterPledge)}</span>
                      </div>
                    )}
                  </Section>
                )}

                {/* Pros/Cons/Description */}
                {analysis.fundamentals && (analysis.fundamentals.pros.length > 0 || analysis.fundamentals.cons.length > 0 || analysis.fundamentals.description) && (
                  <Section title="Screener notes">
                    {analysis.fundamentals.pros.length > 0 && (
                      <div className="mb-3">
                        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Pros</div>
                        <ul className="ml-4 list-disc space-y-1 text-xs">
                          {analysis.fundamentals.pros.map((p, i) => (
                            <li key={i}>{p}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {analysis.fundamentals.cons.length > 0 && (
                      <div className="mb-3">
                        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-red-300">Cons</div>
                        <ul className="ml-4 list-disc space-y-1 text-xs">
                          {analysis.fundamentals.cons.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {analysis.fundamentals.description && (
                      <p className="text-xs text-muted-foreground">{analysis.fundamentals.description}</p>
                    )}
                  </Section>
                )}

                {analysis.warnings.length > 0 && (
                  <Section title="Warnings">
                    <ul className="ml-4 list-disc space-y-1 text-xs text-amber-200">
                      {analysis.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </Section>
                )}
              </div>
            </DrawerBody>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div>{children}</div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold money-tabular">{value}</div>
    </div>
  );
}

function Fund({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold money-tabular">{value}</div>
    </div>
  );
}

function fmtMoney(n: number | null) {
  return n != null && Number.isFinite(n) ? formatINR(n) : "—";
}
function fmtCompact(n: number | null) {
  return n != null && Number.isFinite(n) ? formatCompactINR(n) : "—";
}
function fmtNum(n: number | null | undefined) {
  return n != null && Number.isFinite(n) ? formatNumber(n) : "—";
}
function fmtPct(n: number | null | undefined) {
  return n != null && Number.isFinite(n) ? formatPct(n) : "—";
}
