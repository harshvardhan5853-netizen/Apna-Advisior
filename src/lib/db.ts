import Dexie, { type Table } from "dexie";
import type { MergeHistoryEntry, Portfolio } from "@/types/portfolio";
import type { RebalanceHistoryEntry, TargetPortfolio } from "@/types/target-portfolio";
import type { OpportunityAnalysis } from "@/types/opportunity";

/** Cached opportunity analysis row (Card 5 – Opportunity Finder). 24h TTL enforced in cache.ts. */
export interface CachedOpportunity {
  id: string;
  symbol: string;
  fetchedAt: number;
  analysis: OpportunityAnalysis;
}

/**
 * Local-first IndexedDB layer. Designed so a future sync worker can
 * mirror this into Supabase/Postgres without touching the UI.
 *
 * Schema versioning: bump `version()` when we change indexes.
 */
class ApnaAdvisorDB extends Dexie {
  portfolios!: Table<Portfolio, string>;
  mergeHistory!: Table<MergeHistoryEntry, string>;
  meta!: Table<{ key: string; value: unknown }, string>;
  targetPortfolios!: Table<TargetPortfolio, string>;
  opportunityCache!: Table<CachedOpportunity, string>;
  rebalanceHistory!: Table<RebalanceHistoryEntry, string>;

  constructor() {
    super("apna-advisor");
    this.version(1).stores({
      portfolios: "id, name, status, createdAt, updatedAt",
      mergeHistory: "id, timestamp",
      meta: "key",
    });
    // v2 adds targetPortfolios (Card 4 – Target Portfolio).
    this.version(2).stores({
      portfolios: "id, name, status, createdAt, updatedAt",
      mergeHistory: "id, timestamp",
      meta: "key",
      targetPortfolios: "id, name, status, createdAt, updatedAt",
    });
    // v3 adds opportunityCache (Card 5 – Opportunity Finder).
    this.version(3).stores({
      portfolios: "id, name, status, createdAt, updatedAt",
      mergeHistory: "id, timestamp",
      meta: "key",
      targetPortfolios: "id, name, status, createdAt, updatedAt",
      opportunityCache: "id, symbol, fetchedAt",
    });
    // v4 adds rebalanceHistory (Card 4 #6 – applied-rebalance log).
    this.version(4).stores({
      portfolios: "id, name, status, createdAt, updatedAt",
      mergeHistory: "id, timestamp",
      meta: "key",
      targetPortfolios: "id, name, status, createdAt, updatedAt",
      opportunityCache: "id, symbol, fetchedAt",
      rebalanceHistory: "id, targetPortfolioId, timestamp",
    });
  }
}

// Guard against SSR — Dexie touches IndexedDB on construction.
let _db: ApnaAdvisorDB | null = null;
export function getDB(): ApnaAdvisorDB {
  if (typeof window === "undefined") {
    throw new Error("db access from server context");
  }
  if (!_db) _db = new ApnaAdvisorDB();
  return _db;
}

/** Meta key used to track the currently-active portfolio id. */
export const ACTIVE_PORTFOLIO_KEY = "activePortfolioId";

export async function getActivePortfolioId(): Promise<string | null> {
  const row = await getDB().meta.get(ACTIVE_PORTFOLIO_KEY);
  return (row?.value as string | undefined) ?? null;
}

export async function setActivePortfolioId(id: string | null): Promise<void> {
  await getDB().meta.put({ key: ACTIVE_PORTFOLIO_KEY, value: id });
}

/** Meta key used to track the currently-active target portfolio id (Card 4). */
export const ACTIVE_TARGET_PORTFOLIO_KEY = "activeTargetPortfolioId";

export async function getActiveTargetPortfolioId(): Promise<string | null> {
  const row = await getDB().meta.get(ACTIVE_TARGET_PORTFOLIO_KEY);
  return (row?.value as string | undefined) ?? null;
}

export async function setActiveTargetPortfolioId(id: string | null): Promise<void> {
  await getDB().meta.put({ key: ACTIVE_TARGET_PORTFOLIO_KEY, value: id });
}
