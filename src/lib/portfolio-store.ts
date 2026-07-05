import {
  ACTIVE_PORTFOLIO_KEY,
  getActivePortfolioId,
  getDB,
  setActivePortfolioId,
} from "./db";
import type {
  Holding,
  MergeHistoryEntry,
  Portfolio,
  PortfolioTotals,
} from "@/types/portfolio";
import { uid } from "./utils";

/* --------------------------- pure helpers --------------------------- */

export function computeTotals(holdings: Holding[]): PortfolioTotals {
  let invested = 0;
  let currentValue = 0;
  for (const h of holdings) {
    invested += h.investedAmount || 0;
    currentValue += h.currentValue || 0;
  }
  const pnl = currentValue - invested;
  const pnlPercent = invested > 0 ? pnl / invested : 0;
  return {
    invested,
    currentValue,
    pnl,
    pnlPercent,
    holdingCount: holdings.length,
  };
}

/** Merge key: prefer symbol, fall back to normalized stock name. */
function mergeKey(h: Holding): string {
  const sym = (h.symbol || "").trim().toUpperCase();
  if (sym) return `SYM:${sym}`;
  return `NAME:${(h.stockName || "").trim().toUpperCase()}`;
}

/**
 * Merge `incoming` into `existing`, combining duplicate holdings by
 * weighted average buy price. Returns the merged list plus the ids of
 * incoming rows that were added new vs. merged-in.
 */
export function mergeHoldings(
  existing: Holding[],
  incoming: Holding[],
): {
  merged: Holding[];
  addedIds: string[];
  mergedIntoIds: string[];
} {
  const index = new Map<string, Holding>();
  for (const h of existing) index.set(mergeKey(h), { ...h });

  const addedIds: string[] = [];
  const mergedIntoIds: string[] = [];

  for (const inc of incoming) {
    const key = mergeKey(inc);
    const cur = index.get(key);
    if (!cur) {
      index.set(key, { ...inc });
      addedIds.push(inc.id);
      continue;
    }

    // Duplicate — merge quantities & recompute weighted average buy price.
    const qtyA = cur.quantity || 0;
    const qtyB = inc.quantity || 0;
    const totalQty = qtyA + qtyB;
    const investedA = cur.investedAmount || qtyA * cur.avgBuyPrice;
    const investedB = inc.investedAmount || qtyB * inc.avgBuyPrice;
    const totalInvested = investedA + investedB;
    const newAvg = totalQty > 0 ? totalInvested / totalQty : cur.avgBuyPrice;
    const newCurrentPrice = inc.currentPrice || cur.currentPrice;
    const newCurrentValue = totalQty * newCurrentPrice;
    const newPnl = newCurrentValue - totalInvested;
    const newPnlPct = totalInvested > 0 ? newPnl / totalInvested : 0;

    index.set(key, {
      ...cur,
      // Prefer the more confident row's symbol/name if we had a fallback key.
      symbol: cur.symbol || inc.symbol,
      stockName: cur.stockName || inc.stockName,
      exchange: cur.exchange !== "UNKNOWN" ? cur.exchange : inc.exchange,
      quantity: totalQty,
      avgBuyPrice: newAvg,
      currentPrice: newCurrentPrice,
      investedAmount: totalInvested,
      currentValue: newCurrentValue,
      pnl: newPnl,
      pnlPercent: newPnlPct,
      confidence: Math.max(cur.confidence, inc.confidence),
      needsReview: cur.needsReview || inc.needsReview,
    });
    mergedIntoIds.push(inc.id);
  }

  return { merged: [...index.values()], addedIds, mergedIntoIds };
}

/* --------------------------- read APIs --------------------------- */

export async function listPortfolios(): Promise<Portfolio[]> {
  return getDB().portfolios.orderBy("updatedAt").reverse().toArray();
}

export async function getPortfolio(id: string): Promise<Portfolio | undefined> {
  return getDB().portfolios.get(id);
}

export async function listMergeHistory(): Promise<MergeHistoryEntry[]> {
  return getDB().mergeHistory.orderBy("timestamp").reverse().toArray();
}

export { getActivePortfolioId, setActivePortfolioId, ACTIVE_PORTFOLIO_KEY };

/* --------------------------- write APIs --------------------------- */

interface CreatePortfolioInput {
  name: string;
  holdings: Holding[];
  source: Portfolio["origin"]["source"];
  fileNames: string[];
}

/**
 * Create a brand-new portfolio. Per spec, this ARCHIVES the currently active
 * portfolio (kept in history for restore) and makes the new one active.
 */
export async function createPortfolio(
  input: CreatePortfolioInput,
): Promise<Portfolio> {
  const db = getDB();
  const now = Date.now();
  const activeId = await getActivePortfolioId();

  const portfolio: Portfolio = {
    id: uid("pf"),
    name: input.name.trim() || "Untitled Portfolio",
    status: "active",
    createdAt: now,
    updatedAt: now,
    holdings: input.holdings,
    totals: computeTotals(input.holdings),
    origin: { source: input.source, fileNames: input.fileNames },
  };

  await db.transaction(
    "rw",
    db.portfolios,
    db.mergeHistory,
    db.meta,
    async () => {
      if (activeId) {
        const prev = await db.portfolios.get(activeId);
        if (prev) {
          await db.portfolios.update(activeId, {
            status: "archived",
            updatedAt: now,
          });
        }
      }
      await db.portfolios.add(portfolio);
      await db.meta.put({ key: ACTIVE_PORTFOLIO_KEY, value: portfolio.id });
      await db.mergeHistory.add({
        id: uid("mh"),
        timestamp: now,
        description: `Created portfolio "${portfolio.name}"`,
        action: {
          type: "create",
          portfolioId: portfolio.id,
          previousActiveId: activeId ?? undefined,
        },
      });
    },
  );

  return portfolio;
}

interface MergeIntoInput {
  targetPortfolioId: string;
  incoming: Holding[];
  incomingSourceName?: string;
}

export async function mergeIntoPortfolio(input: MergeIntoInput): Promise<{
  portfolio: Portfolio;
  addedCount: number;
  mergedCount: number;
}> {
  const db = getDB();
  const now = Date.now();
  const target = await db.portfolios.get(input.targetPortfolioId);
  if (!target) throw new Error("Target portfolio not found");

  const snapshot: Portfolio = JSON.parse(JSON.stringify(target));
  const { merged, addedIds, mergedIntoIds } = mergeHoldings(
    target.holdings,
    input.incoming,
  );

  const nextPortfolio: Portfolio = {
    ...target,
    holdings: merged,
    totals: computeTotals(merged),
    updatedAt: now,
    origin: {
      source: target.origin.source,
      fileNames: input.incomingSourceName
        ? [...target.origin.fileNames, input.incomingSourceName]
        : target.origin.fileNames,
    },
  };

  await db.transaction("rw", db.portfolios, db.mergeHistory, async () => {
    await db.portfolios.put(nextPortfolio);
    await db.mergeHistory.add({
      id: uid("mh"),
      timestamp: now,
      description: `Merged ${input.incoming.length} holding(s) into "${target.name}"`,
      action: {
        type: "merge",
        targetPortfolioId: target.id,
        previousSnapshot: snapshot,
        addedHoldingIds: addedIds,
        mergedHoldingIds: mergedIntoIds,
      },
    });
  });

  return {
    portfolio: nextPortfolio,
    addedCount: addedIds.length,
    mergedCount: mergedIntoIds.length,
  };
}

export async function renamePortfolio(id: string, name: string): Promise<void> {
  const db = getDB();
  await db.portfolios.update(id, { name: name.trim(), updatedAt: Date.now() });
}

export async function deletePortfolio(id: string): Promise<void> {
  const db = getDB();
  await db.transaction("rw", db.portfolios, db.meta, async () => {
    await db.portfolios.delete(id);
    const active = await getActivePortfolioId();
    if (active === id) {
      const remaining = await db.portfolios
        .where("status")
        .equals("active")
        .first();
      await setActivePortfolioId(remaining?.id ?? null);
    }
  });
}

export async function duplicatePortfolio(id: string): Promise<Portfolio> {
  const db = getDB();
  const src = await db.portfolios.get(id);
  if (!src) throw new Error("Portfolio not found");
  const now = Date.now();
  const copy: Portfolio = {
    ...JSON.parse(JSON.stringify(src)),
    id: uid("pf"),
    name: `${src.name} (Copy)`,
    status: "archived", // don't auto-activate
    createdAt: now,
    updatedAt: now,
  };
  await db.portfolios.add(copy);
  return copy;
}

export async function archivePortfolio(id: string): Promise<void> {
  const db = getDB();
  await db.transaction("rw", db.portfolios, db.meta, async () => {
    await db.portfolios.update(id, {
      status: "archived",
      updatedAt: Date.now(),
    });
    const active = await getActivePortfolioId();
    if (active === id) {
      const nextActive = await db.portfolios
        .where("status")
        .equals("active")
        .first();
      await setActivePortfolioId(nextActive?.id ?? null);
    }
  });
}

export async function restorePortfolio(id: string): Promise<void> {
  await getDB().portfolios.update(id, {
    status: "active",
    updatedAt: Date.now(),
  });
}

export async function switchActivePortfolio(id: string): Promise<void> {
  const db = getDB();
  const p = await db.portfolios.get(id);
  if (!p) throw new Error("Portfolio not found");
  if (p.status === "archived") {
    await db.portfolios.update(id, { status: "active" });
  }
  await setActivePortfolioId(id);
}

/**
 * Undo the last merge or creation. Returns true if something was undone.
 */
export async function undoLastMerge(): Promise<boolean> {
  const db = getDB();
  const last = await db.mergeHistory.orderBy("timestamp").last();
  if (!last) return false;

  await db.transaction(
    "rw",
    db.portfolios,
    db.mergeHistory,
    db.meta,
    async () => {
      if (last.action.type === "merge") {
        await db.portfolios.put(last.action.previousSnapshot);
      } else if (last.action.type === "create") {
        await db.portfolios.delete(last.action.portfolioId);
        if (last.action.previousActiveId) {
          await db.portfolios.update(last.action.previousActiveId, {
            status: "active",
          });
          await setActivePortfolioId(last.action.previousActiveId);
        } else {
          await setActivePortfolioId(null);
        }
      }
      await db.mergeHistory.delete(last.id);
    },
  );
  return true;
}
