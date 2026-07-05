import type { Recommendation, SubScores } from "@/types/opportunity";

export interface AdvisorVerdict {
  score: number;
  recommendation: Recommendation;
  confidence: number;
}

const WEIGHTS: Record<keyof SubScores, number> = {
  value: 0.2,
  quality: 0.2,
  growth: 0.15,
  momentum: 0.15,
  health: 0.15,
  news: 0.15,
};

const NEUTRAL = 50;

function clamp(n: number, lo = 0, hi = 100): number {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

export function classifyRecommendation(score: number): Recommendation {
  if (score >= 85) return "strong-buy";
  if (score >= 70) return "buy";
  if (score >= 50) return "hold";
  if (score >= 35) return "sell";
  return "strong-sell";
}

export function computeAdvisorScore(subs: SubScores): AdvisorVerdict {
  const keys = Object.keys(WEIGHTS) as Array<keyof SubScores>;
  const rawValues = keys.map((k) => clamp(subs[k]));

  // Drop dimensions that are exactly NEUTRAL (50) — these signal "no data" fallback
  // from the sub-score functions (e.g. EMPTY_NEWS or missing fundamentals). Keeping
  // them at 50 drags every stock toward "hold" and hides real signal.
  const activeIndices: number[] = [];
  for (let i = 0; i < keys.length; i++) {
    if (Math.abs(rawValues[i] - NEUTRAL) > 0.5) {
      activeIndices.push(i);
    }
  }

  let weighted = 0;
  let weightSum = 0;
  if (activeIndices.length === 0) {
    weighted = NEUTRAL;
    weightSum = 1;
  } else {
    for (const i of activeIndices) {
      const w = WEIGHTS[keys[i]];
      weighted += rawValues[i] * w;
      weightSum += w;
    }
  }
  const score = Math.round(clamp(weightSum > 0 ? weighted / weightSum : NEUTRAL));

  const activeValues = activeIndices.length > 0 ? activeIndices.map((i) => rawValues[i]) : rawValues;
  const min = Math.min(...activeValues);
  const max = Math.max(...activeValues);
  const spreadComponent = max > 0 ? (min / max) * 60 : 0;

  const matchedComponent = (activeIndices.length / rawValues.length) * 40;

  const confidenceRaw = spreadComponent + matchedComponent;
  const confidence = clamp(confidenceRaw, 0, 100) / 100;

  return {
    score,
    recommendation: classifyRecommendation(score),
    confidence,
  };
}
