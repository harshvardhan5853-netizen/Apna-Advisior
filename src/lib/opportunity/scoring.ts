import type {
  Fundamentals,
  NewsSummary,
  SubScores,
  TechnicalSnapshot,
} from "@/types/opportunity";

const NEUTRAL = 50;

function clamp(n: number, lo = 0, hi = 100): number {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

function isNum(n: number | null | undefined): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

/**
 * Value sub-score 0..100.
 * Rewards cheapness across PE, PB, PEG, DivYield, P/S.
 * PE also compared to sector avg when available.
 */
function computeValueScore(f: Fundamentals | null): number {
  if (!f) return NEUTRAL;
  let score = 0;
  let maxScore = 0;

  // PE (30 pts): cheap vs sector avg (or absolute <20)
  if (isNum(f.pe) && f.pe > 0) {
    maxScore += 30;
    if (isNum(f.sectorAvgPe) && f.sectorAvgPe > 0) {
      const ratio = f.pe / f.sectorAvgPe;
      if (ratio <= 0.7) score += 30;
      else if (ratio <= 0.9) score += 22;
      else if (ratio <= 1.1) score += 15;
      else if (ratio <= 1.3) score += 8;
      else score += 2;
    } else {
      if (f.pe <= 12) score += 30;
      else if (f.pe <= 18) score += 22;
      else if (f.pe <= 25) score += 15;
      else if (f.pe <= 35) score += 8;
      else score += 2;
    }
  }

  // PB (20 pts): <3 preferred
  if (isNum(f.pb) && f.pb > 0) {
    maxScore += 20;
    if (f.pb <= 1) score += 20;
    else if (f.pb <= 2) score += 15;
    else if (f.pb <= 3) score += 12;
    else if (f.pb <= 5) score += 6;
    else score += 2;
  }

  // PEG (20 pts): <1.5 preferred
  if (isNum(f.peg) && f.peg > 0) {
    maxScore += 20;
    if (f.peg <= 0.75) score += 20;
    else if (f.peg <= 1) score += 16;
    else if (f.peg <= 1.5) score += 12;
    else if (f.peg <= 2.5) score += 6;
    else score += 2;
  }

  // Dividend yield (15 pts): >2% preferred
  if (isNum(f.divYield) && f.divYield >= 0) {
    maxScore += 15;
    const pct = f.divYield * 100;
    if (pct >= 4) score += 15;
    else if (pct >= 3) score += 12;
    else if (pct >= 2) score += 9;
    else if (pct >= 1) score += 5;
    else score += 1;
  }

  // P/S (15 pts): <3 preferred
  if (isNum(f.ps) && f.ps > 0) {
    maxScore += 15;
    if (f.ps <= 1) score += 15;
    else if (f.ps <= 2) score += 12;
    else if (f.ps <= 3) score += 8;
    else if (f.ps <= 5) score += 4;
    else score += 1;
  }

  if (maxScore === 0) return NEUTRAL;
  return clamp((score / maxScore) * 100);
}

/**
 * Quality sub-score 0..100.
 * Rewards high returns and margins.
 */
function computeQualityScore(f: Fundamentals | null): number {
  if (!f) return NEUTRAL;
  let score = 0;
  let maxScore = 0;

  if (isNum(f.roe)) {
    maxScore += 30;
    const pct = f.roe * 100;
    if (pct >= 25) score += 30;
    else if (pct >= 20) score += 25;
    else if (pct >= 15) score += 20;
    else if (pct >= 10) score += 12;
    else if (pct >= 5) score += 5;
    else score += 1;
  }

  if (isNum(f.roce)) {
    maxScore += 30;
    const pct = f.roce * 100;
    if (pct >= 25) score += 30;
    else if (pct >= 20) score += 25;
    else if (pct >= 15) score += 20;
    else if (pct >= 10) score += 12;
    else if (pct >= 5) score += 5;
    else score += 1;
  }

  if (isNum(f.opMargin)) {
    maxScore += 20;
    const pct = f.opMargin * 100;
    if (pct >= 25) score += 20;
    else if (pct >= 20) score += 16;
    else if (pct >= 15) score += 12;
    else if (pct >= 10) score += 7;
    else if (pct >= 5) score += 3;
    else score += 1;
  }

  if (isNum(f.netMargin)) {
    maxScore += 20;
    const pct = f.netMargin * 100;
    if (pct >= 20) score += 20;
    else if (pct >= 15) score += 16;
    else if (pct >= 10) score += 12;
    else if (pct >= 5) score += 6;
    else if (pct >= 0) score += 2;
    else score += 0;
  }

  if (maxScore === 0) return NEUTRAL;
  return clamp((score / maxScore) * 100);
}

/**
 * Growth sub-score 0..100.
 */
function computeGrowthScore(f: Fundamentals | null): number {
  if (!f) return NEUTRAL;
  let score = 0;
  let maxScore = 0;

  const scoreGrowth = (g: number, weight: number): number => {
    const pct = g * 100;
    if (pct >= 25) return weight;
    if (pct >= 15) return weight * 0.8;
    if (pct >= 10) return weight * 0.6;
    if (pct >= 5) return weight * 0.4;
    if (pct >= 0) return weight * 0.2;
    if (pct >= -10) return weight * 0.05;
    return 0;
  };

  if (isNum(f.revenueGrowth)) {
    maxScore += 25;
    score += scoreGrowth(f.revenueGrowth, 25);
  }
  if (isNum(f.profitGrowth)) {
    maxScore += 25;
    score += scoreGrowth(f.profitGrowth, 25);
  }
  if (isNum(f.epsGrowth)) {
    maxScore += 25;
    score += scoreGrowth(f.epsGrowth, 25);
  }
  if (isNum(f.bookValueGrowth)) {
    maxScore += 25;
    // Book value growth: any positive is good
    const pct = f.bookValueGrowth * 100;
    if (pct >= 15) score += 25;
    else if (pct >= 8) score += 18;
    else if (pct >= 3) score += 12;
    else if (pct >= 0) score += 6;
    else score += 1;
  }

  if (maxScore === 0) return NEUTRAL;
  return clamp((score / maxScore) * 100);
}

/**
 * Momentum sub-score 0..100.
 * Direct pass-through of technical.momentumScore.
 */
function computeMomentumScore(t: TechnicalSnapshot | null): number {
  if (!t) return NEUTRAL;
  if (isNum(t.momentumScore)) return clamp(t.momentumScore);
  return NEUTRAL;
}

/**
 * Financial Health sub-score 0..100.
 */
function computeHealthScore(f: Fundamentals | null): number {
  if (!f) return NEUTRAL;
  let score = 0;
  let maxScore = 0;

  // Debt-to-Equity (30 pts): <0.5 preferred, higher = worse
  if (isNum(f.debtEquity)) {
    maxScore += 30;
    if (f.debtEquity <= 0.3) score += 30;
    else if (f.debtEquity <= 0.5) score += 24;
    else if (f.debtEquity <= 1) score += 16;
    else if (f.debtEquity <= 2) score += 8;
    else score += 2;
  }

  // Current Ratio (25 pts): >1.5 preferred
  if (isNum(f.currentRatio) && f.currentRatio > 0) {
    maxScore += 25;
    if (f.currentRatio >= 2) score += 25;
    else if (f.currentRatio >= 1.5) score += 20;
    else if (f.currentRatio >= 1) score += 12;
    else score += 3;
  }

  // Interest Coverage (25 pts): >5 preferred
  if (isNum(f.interestCoverage)) {
    maxScore += 25;
    if (f.interestCoverage >= 10) score += 25;
    else if (f.interestCoverage >= 5) score += 20;
    else if (f.interestCoverage >= 2) score += 12;
    else if (f.interestCoverage >= 1) score += 5;
    else score += 1;
  }

  // FCF (20 pts): positive preferred
  if (isNum(f.fcf)) {
    maxScore += 20;
    if (f.fcf > 0) score += 20;
    else if (f.fcf === 0) score += 8;
    else score += 2;
  }

  // Promoter pledge penalty (only applied if we have any data)
  if (isNum(f.promoterPledge) && maxScore > 0) {
    const pct = f.promoterPledge * 100;
    if (pct >= 25) score = Math.max(0, score - 15);
    else if (pct >= 10) score = Math.max(0, score - 8);
    else if (pct >= 5) score = Math.max(0, score - 3);
  }

  if (maxScore === 0) return NEUTRAL;
  return clamp((score / maxScore) * 100);
}

const SENTIMENT_POINTS: Record<string, number> = {
  "very-positive": 100,
  positive: 75,
  neutral: 50,
  negative: 25,
  "very-negative": 0,
};

/**
 * News sub-score 0..100.
 * Uses precomputed averageScore if available, else derives from headlines tier mix.
 */
function computeNewsScore(news: NewsSummary | null): number {
  if (!news || news.totalCount === 0) return NEUTRAL;

  // Trust averageScore if present and looks in-range
  if (isNum(news.averageScore) && news.averageScore >= 0 && news.averageScore <= 100) {
    return clamp(news.averageScore);
  }

  const headlines = news.headlines ?? [];
  if (headlines.length === 0) return NEUTRAL;

  let sum = 0;
  let count = 0;
  for (const h of headlines) {
    const pts = SENTIMENT_POINTS[h.sentiment];
    if (typeof pts === "number") {
      sum += pts;
      count += 1;
    }
  }
  if (count === 0) return NEUTRAL;
  return clamp(sum / count);
}

export function computeSubScores(
  fundamentals: Fundamentals | null,
  technical: TechnicalSnapshot | null,
  news: NewsSummary | null,
): SubScores {
  return {
    value: Math.round(computeValueScore(fundamentals)),
    quality: Math.round(computeQualityScore(fundamentals)),
    growth: Math.round(computeGrowthScore(fundamentals)),
    momentum: Math.round(computeMomentumScore(technical)),
    health: Math.round(computeHealthScore(fundamentals)),
    news: Math.round(computeNewsScore(news)),
  };
}
