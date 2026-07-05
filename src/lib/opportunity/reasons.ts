import type {
  Fundamentals,
  Recommendation,
  SubScores,
  TechnicalSnapshot,
  ValuationBreakdown,
} from "@/types/opportunity";
import type { AdvisorVerdict } from "./advisor";

const MAX_REASONS = 5;
const STRONG_SCORE = 70;
const WEAK_SCORE = 40;

interface ReasonEntry {
  text: string;
  strength: number; // higher = more prominent
  positive: boolean;
}

function pct(fraction: number | null | undefined, digits = 1): string | null {
  if (fraction == null || !Number.isFinite(fraction)) return null;
  return `${(fraction * 100).toFixed(digits)}%`;
}

function pushValueReasons(scores: SubScores, f: Fundamentals | null, out: ReasonEntry[]): void {
  if (scores.value >= STRONG_SCORE) {
    const bits: string[] = [];
    if (f?.pe != null && Number.isFinite(f.pe)) bits.push(`PE ${f.pe.toFixed(1)}`);
    if (f?.pb != null && Number.isFinite(f.pb)) bits.push(`PB ${f.pb.toFixed(1)}`);
    if (f?.divYield != null) {
      const dy = pct(f.divYield, 1);
      if (dy) bits.push(`div yield ${dy}`);
    }
    const suffix = bits.length ? ` (${bits.join(", ")})` : "";
    out.push({ text: `Attractively valued${suffix}`, strength: scores.value, positive: true });
  } else if (scores.value <= WEAK_SCORE) {
    const bits: string[] = [];
    if (f?.pe != null && Number.isFinite(f.pe)) bits.push(`PE ${f.pe.toFixed(1)}`);
    if (f?.pb != null && Number.isFinite(f.pb)) bits.push(`PB ${f.pb.toFixed(1)}`);
    const suffix = bits.length ? ` (${bits.join(", ")})` : "";
    out.push({
      text: `Valuation looks stretched${suffix}`,
      strength: 100 - scores.value,
      positive: false,
    });
  }
}

function pushQualityReasons(scores: SubScores, f: Fundamentals | null, out: ReasonEntry[]): void {
  if (scores.quality >= STRONG_SCORE) {
    const roe = pct(f?.roe ?? null, 1);
    const roce = pct(f?.roce ?? null, 1);
    const bits: string[] = [];
    if (roe) bits.push(`ROE ${roe}`);
    if (roce) bits.push(`ROCE ${roce}`);
    const suffix = bits.length ? ` (${bits.join(", ")})` : "";
    out.push({
      text: `Strong return-on-capital profile${suffix}`,
      strength: scores.quality,
      positive: true,
    });
  } else if (scores.quality <= WEAK_SCORE) {
    const roe = pct(f?.roe ?? null, 1);
    const suffix = roe ? ` (ROE ${roe})` : "";
    out.push({
      text: `Weak profitability metrics${suffix}`,
      strength: 100 - scores.quality,
      positive: false,
    });
  }
}

function pushGrowthReasons(scores: SubScores, f: Fundamentals | null, out: ReasonEntry[]): void {
  if (scores.growth >= STRONG_SCORE) {
    const bits: string[] = [];
    const rev = pct(f?.revenueGrowth ?? null, 1);
    const profit = pct(f?.profitGrowth ?? null, 1);
    if (rev) bits.push(`revenue ${rev}`);
    if (profit) bits.push(`profit ${profit}`);
    const suffix = bits.length ? ` (${bits.join(", ")})` : "";
    out.push({
      text: `Growth firing on multiple fronts${suffix}`,
      strength: scores.growth,
      positive: true,
    });
  } else if (scores.growth <= WEAK_SCORE) {
    const bits: string[] = [];
    const rev = pct(f?.revenueGrowth ?? null, 1);
    const profit = pct(f?.profitGrowth ?? null, 1);
    if (rev) bits.push(`revenue ${rev}`);
    if (profit) bits.push(`profit ${profit}`);
    const suffix = bits.length ? ` (${bits.join(", ")})` : "";
    out.push({
      text: `Growth is stalling${suffix}`,
      strength: 100 - scores.growth,
      positive: false,
    });
  }
}

function pushMomentumReasons(
  scores: SubScores,
  technical: TechnicalSnapshot | null,
  out: ReasonEntry[],
): void {
  if (!technical) return;
  const trend = technical.trend;
  if (scores.momentum >= STRONG_SCORE || trend === "strong-up") {
    const goldenCross =
      technical.sma50 != null && technical.sma200 != null && technical.sma50 > technical.sma200;
    const label = goldenCross
      ? "Golden cross confirmed with strong uptrend"
      : "Technical momentum is bullish";
    out.push({ text: label, strength: scores.momentum, positive: true });
  } else if (scores.momentum <= WEAK_SCORE || trend === "strong-down") {
    const deathCross =
      technical.sma50 != null && technical.sma200 != null && technical.sma50 < technical.sma200;
    const label = deathCross
      ? "Death cross flags a sustained downtrend"
      : "Technical momentum is weak";
    out.push({ text: label, strength: 100 - scores.momentum, positive: false });
  }
}

function pushHealthReasons(scores: SubScores, f: Fundamentals | null, out: ReasonEntry[]): void {
  if (scores.health >= STRONG_SCORE) {
    const bits: string[] = [];
    if (f?.debtEquity != null && Number.isFinite(f.debtEquity)) {
      bits.push(`D/E ${f.debtEquity.toFixed(2)}`);
    }
    if (f?.currentRatio != null && Number.isFinite(f.currentRatio)) {
      bits.push(`current ratio ${f.currentRatio.toFixed(1)}`);
    }
    const suffix = bits.length ? ` (${bits.join(", ")})` : "";
    out.push({
      text: `Balance sheet looks healthy${suffix}`,
      strength: scores.health,
      positive: true,
    });
  } else if (scores.health <= WEAK_SCORE) {
    const bits: string[] = [];
    if (f?.debtEquity != null && Number.isFinite(f.debtEquity)) {
      bits.push(`D/E ${f.debtEquity.toFixed(2)}`);
    }
    if (f?.promoterPledge != null && f.promoterPledge > 0) {
      const p = pct(f.promoterPledge, 1);
      if (p) bits.push(`promoter pledge ${p}`);
    }
    const suffix = bits.length ? ` (${bits.join(", ")})` : "";
    out.push({
      text: `Financial health raises red flags${suffix}`,
      strength: 100 - scores.health,
      positive: false,
    });
  }
}

function pushNewsReasons(scores: SubScores, out: ReasonEntry[]): void {
  if (scores.news >= STRONG_SCORE) {
    out.push({
      text: "Recent news sentiment is positive",
      strength: scores.news,
      positive: true,
    });
  } else if (scores.news <= WEAK_SCORE) {
    out.push({
      text: "Recent news sentiment is negative",
      strength: 100 - scores.news,
      positive: false,
    });
  }
}

function pushValuationReasons(valuation: ValuationBreakdown, out: ReasonEntry[]): void {
  const gap = valuation.discountPercent;
  if (gap == null || !Number.isFinite(gap)) return;
  const gapPct = Math.abs(gap * 100);
  if (gap >= 0.15) {
    out.push({
      text: `Price ${gapPct.toFixed(1)}% below estimated fair value`,
      strength: Math.min(100, gapPct + 40),
      positive: true,
    });
  } else if (gap <= -0.15) {
    out.push({
      text: `Price ${gapPct.toFixed(1)}% above estimated fair value`,
      strength: Math.min(100, gapPct + 40),
      positive: false,
    });
  }
}

function recommendationTone(rec: Recommendation): "buy" | "hold" | "sell" {
  if (rec === "strong-buy" || rec === "buy") return "buy";
  if (rec === "strong-sell" || rec === "sell") return "sell";
  return "hold";
}

function buildHinglish(
  verdict: AdvisorVerdict,
  reasons: ReasonEntry[],
): string {
  const tone = recommendationTone(verdict.recommendation);
  const scoreText = Math.round(verdict.score);
  const positives = reasons.filter((r) => r.positive).slice(0, 2);
  const negatives = reasons.filter((r) => !r.positive).slice(0, 2);

  if (tone === "buy") {
    const highlights = positives.length
      ? positives.map((r) => r.text.toLowerCase()).join(", ")
      : "fundamentals decent lag rahe hain";
    const verb = verdict.recommendation === "strong-buy" ? "strongly buy" : "buy karne ka case banta hai";
    return `Advisor score ${scoreText}/100 — ${highlights}. Long-term view se ${verb}, apna risk check karke lo.`;
  }
  if (tone === "sell") {
    const concerns = negatives.length
      ? negatives.map((r) => r.text.toLowerCase()).join(", ")
      : "risk-reward attractive nahi lag raha";
    const verb =
      verdict.recommendation === "strong-sell"
        ? "book profit ya exit sochna chahiye"
        : "position halka karne ka time hai";
    return `Advisor score ${scoreText}/100 — ${concerns}. Isliye ${verb}, blindly hold mat karo.`;
  }
  const mix: string[] = [];
  if (positives[0]) mix.push(positives[0].text.toLowerCase());
  if (negatives[0]) mix.push(negatives[0].text.toLowerCase());
  const mixText = mix.length ? mix.join(" but ") : "signals mixed hain";
  return `Advisor score ${scoreText}/100 — ${mixText}. Abhi wait karo, better setup ka intezaar karna theek rahega.`;
}

export function generateReasons(
  scores: SubScores,
  valuation: ValuationBreakdown,
  technical: TechnicalSnapshot | null,
  fundamentals: Fundamentals | null,
  verdict: AdvisorVerdict,
): { reasons: string[]; hinglish: string } {
  const entries: ReasonEntry[] = [];

  pushValuationReasons(valuation, entries);
  pushValueReasons(scores, fundamentals, entries);
  pushQualityReasons(scores, fundamentals, entries);
  pushGrowthReasons(scores, fundamentals, entries);
  pushMomentumReasons(scores, technical, entries);
  pushHealthReasons(scores, fundamentals, entries);
  pushNewsReasons(scores, entries);

  // Pull in any strong valuation reasons that we didn't already surface.
  if (valuation.reasons && valuation.reasons.length) {
    const existing = new Set(entries.map((e) => e.text.toLowerCase()));
    for (const raw of valuation.reasons) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      if (existing.has(trimmed.toLowerCase())) continue;
      entries.push({ text: trimmed, strength: 55, positive: true });
      if (entries.length >= MAX_REASONS * 2) break;
    }
  }

  // Sort by strength desc, prefer alternating positive/negative for a balanced picture.
  const sorted = entries.slice().sort((a, b) => b.strength - a.strength);
  const reasons: string[] = [];
  for (const entry of sorted) {
    if (reasons.length >= MAX_REASONS) break;
    if (!reasons.includes(entry.text)) reasons.push(entry.text);
  }

  if (reasons.length === 0) {
    reasons.push(
      `Advisor score ${Math.round(verdict.score)}/100 with mixed signals — no strong catalyst either way.`,
    );
  }

  const hinglish = buildHinglish(verdict, sorted);
  return { reasons, hinglish };
}
