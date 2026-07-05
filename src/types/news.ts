// News Intelligence types
// Portfolio-scoped news fetched from RSS + official filings, then LLM-analyzed for
// sentiment / category / Hinglish explanation.

export type NewsSentiment =
  | "very-positive"
  | "positive"
  | "neutral"
  | "negative"
  | "very-negative";

export type NewsCategory =
  | "earnings"
  | "order-win"
  | "management-change"
  | "regulatory"
  | "dividend"
  | "buyback"
  | "split"
  | "bonus-issue"
  | "merger-acquisition"
  | "product-launch"
  | "expansion"
  | "guidance"
  | "legal"
  | "credit-rating"
  | "analyst-action"
  | "insider-activity"
  | "macro-impact"
  | "other";

export type NewsSource =
  | "google-news"
  | "nse-filing"
  | "bse-filing"
  | "business-standard"
  | "economic-times"
  | "moneycontrol"
  | "livemint"
  | "reuters"
  | "yahoo"
  | "other";

export type NewsImpactHorizon =
  | "immediate"
  | "short-term"
  | "medium-term"
  | "long-term"
  | "uncertain";

/** A raw (pre-analysis) article as pulled from any source. */
export interface RawNewsArticle {
  /** Stable identifier — sha1(normalized URL). */
  id: string;
  /** Original URL. */
  url: string;
  /** Canonicalized URL for dedupe (lowercased host, no utm params, no fragment). */
  canonicalUrl: string;
  title: string;
  /** RSS "description" or "summary" — often HTML; caller should sanitize before render. */
  snippet: string | null;
  /** Publisher name if known — inferred from feed or hostname. */
  publisher: string | null;
  /** Where we fetched it from (may differ from publisher e.g. google-news -> ET). */
  source: NewsSource;
  /** Unix ms. */
  publishedAt: number;
  /** Symbols/names it matched during the query build — used to attribute. */
  matchedSymbols: string[];
}

/** LLM-generated analysis for a single article. Cached forever per article id. */
export interface NewsAnalysis {
  sentiment: NewsSentiment;
  /** 0..1 fraction, how confident the model is in the sentiment call. */
  confidence: number;
  category: NewsCategory;
  /** Which stocks in the portfolio this article materially affects (subset of matchedSymbols). */
  affectedSymbols: string[];
  /** Casual Hinglish (Latin script) explanation aimed at a retail Indian investor. 1-2 sentences. */
  hinglishExplanation: string;
  /** One-line "why this matters" in English, investor-first. */
  whyItMatters: string;
  /** Expected horizon of the impact. */
  impactHorizon: NewsImpactHorizon;
  /** 0-100 importance/materiality score used for Breaking flags and sort. */
  importance: number;
  /** Model that produced this analysis + timestamp. Useful for cache invalidation. */
  model: string;
  analyzedAt: number;
}

/** Fully-hydrated article ready for UI. */
export interface AnalyzedNewsArticle extends RawNewsArticle {
  analysis: NewsAnalysis | null;
  /** True if we tried to analyze and failed (e.g. Gemini quota hit). Cached negative result. */
  analysisFailed?: boolean;
  analysisError?: string;
}

/** API response shape from /api/news. */
export interface NewsFetchResult {
  articles: AnalyzedNewsArticle[];
  fetchedAt: number;
  /** Symbols we queried but got 0 hits for. */
  emptySymbols: string[];
  /** Symbols we couldn't build a query for (missing name AND symbol). */
  unresolvedSymbols: string[];
  /** Whether the Gemini analysis succeeded (partially) or wasn't attempted (no key). */
  llmEnabled: boolean;
  /** Non-fatal warnings shown as amber banner in UI. */
  warnings: string[];
}

/** Shape of the summary shown at the top of /news. */
export interface NewsSummary {
  totalArticles: number;
  byStock: Record<string, number>;
  bySentiment: Record<NewsSentiment, number>;
  byCategory: Partial<Record<NewsCategory, number>>;
  mostCoveredStock: { symbol: string; count: number } | null;
  latestAt: number | null;
  lastUpdated: number;
}

/** Filter state for the /news view. */
export interface NewsFilterState {
  stockSymbols: string[]; // empty = all
  sentiments: NewsSentiment[]; // empty = all
  categories: NewsCategory[]; // empty = all
  sources: NewsSource[]; // empty = all
  /** How many days back to include. */
  timeframeDays: 1 | 7 | 30 | 90;
  query: string; // free text search over title/snippet
}
