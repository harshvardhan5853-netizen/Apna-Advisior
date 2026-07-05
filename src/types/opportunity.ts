// Card 5 (Opportunity Finder) types.

export type Recommendation =
  | "strong-buy"
  | "buy"
  | "hold"
  | "sell"
  | "strong-sell";

export type ValuationStatus = "undervalued" | "fair" | "overvalued";

export type RiskLevel = "low" | "medium" | "high" | "very-high";

export type OpportunityTag =
  | "cheap"
  | "growth"
  | "dividend"
  | "high-quality"
  | "turnaround";

export interface Fundamentals {
  // Valuation
  pe: number | null;
  forwardPe: number | null;
  pb: number | null;
  peg: number | null;
  ps: number | null;
  evEbitda: number | null;
  divYield: number | null; // fraction (0.025 = 2.5%)
  earningsYield: number | null; // fraction

  // Growth (all YoY fractions)
  revenueGrowth: number | null;
  profitGrowth: number | null;
  epsGrowth: number | null;
  bookValueGrowth: number | null;
  cashFlowGrowth: number | null;

  // Quality (all fractions)
  roe: number | null;
  roce: number | null;
  roa: number | null;
  opMargin: number | null;
  netMargin: number | null;

  // Financial Health
  debtEquity: number | null;
  currentRatio: number | null;
  interestCoverage: number | null;
  fcf: number | null; // absolute value (rupees crore)
  promoterPledge: number | null; // fraction

  // Ownership (fractions)
  promoterHolding: number | null;
  fiiHolding: number | null;
  diiHolding: number | null;
  publicHolding: number | null;

  // Extras
  eps: number | null;
  bookValue: number | null;
  marketCap: number | null; // rupees (raw, absolute)
  sectorAvgPe: number | null;
  historicalPe: number | null; // 5y avg
  historicalPb: number | null;

  // Screener quick hits
  pros: string[];
  cons: string[];
  description: string | null;

  fetchedAt: number;
  source: "screener" | "manual" | "cache";
  warnings: string[];
}

export interface PriceHistory {
  timestamps: number[];
  closes: number[];
  highs: number[];
  lows: number[];
  volumes: number[];
}

export interface TechnicalSnapshot {
  price: number | null;
  rsi: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  ema20: number | null;
  ema50: number | null;
  ema200: number | null;
  bollingerLower: number | null;
  bollingerUpper: number | null;
  atr: number | null;
  adx: number | null;
  volume: number | null;
  avgVolume: number | null;
  relativeVolume: number | null;
  support: number | null;
  resistance: number | null;
  high52w: number | null;
  low52w: number | null;
  // Returns (fractions)
  return1m: number | null;
  return3m: number | null;
  return6m: number | null;
  return1y: number | null;
  // Derived
  momentumScore: number; // 0..100
  trend: "strong-up" | "up" | "neutral" | "down" | "strong-down";
  beta: number | null; // covariance(stock, NIFTY) / variance(NIFTY) over ~1y daily returns
}

export interface ValuationBreakdown {
  status: ValuationStatus;
  fairValue: number | null;
  discountPercent: number | null; // (fairValue - price) / fairValue, positive = undervalued
  dcfValue: number | null;
  peBased: number | null;
  pbBased: number | null;
  reasons: string[];
}

export interface SubScores {
  value: number; // 0..100
  quality: number;
  growth: number;
  momentum: number;
  health: number;
  news: number;
}

export interface RiskIndicators {
  level: RiskLevel;
  volatility: number | null; // annualized fraction
  drawdownFromHigh: number | null; // fraction, positive
  sectorRisk: string;
  marketCapRisk: string;
  notes: string[];
}

export interface NewsSummary {
  totalCount: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  averageScore: number; // 0..100
  headlines: Array<{ title: string; url: string; sentiment: string; publishedAt: number }>;
}

export interface OpportunityAnalysis {
  symbol: string;
  yahooSymbol: string | null;
  name: string;
  sector: string | null;
  industry: string | null;
  marketCap: "Large" | "Mid" | "Small" | "Unknown" | null;
  currentPrice: number | null;
  previousClose: number | null;
  dayChange: number | null;
  dayChangePercent: number | null;
  fundamentals: Fundamentals | null;
  technical: TechnicalSnapshot | null;
  valuation: ValuationBreakdown;
  scores: SubScores;
  advisorScore: number; // 0..100
  recommendation: Recommendation;
  confidence: number; // 0..1
  reasons: string[];
  hinglish: string;
  risk: RiskIndicators;
  news: NewsSummary;
  tags: OpportunityTag[];
  analyzedAt: number;
  warnings: string[];
}

export interface OpportunityFilterState {
  recommendations: Recommendation[]; // empty = all
  tags: OpportunityTag[]; // empty = all
  sector: string | "all";
  riskLevel: RiskLevel | "all";
  query: string;
  minScore: number; // 0..100
  onlyInPortfolio: boolean;
}

export interface OpportunityFetchResult {
  analyses: OpportunityAnalysis[];
  fetchedAt: number;
  missing: string[];
  warnings: string[];
}
