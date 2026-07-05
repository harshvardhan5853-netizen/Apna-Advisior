"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDB, ACTIVE_TARGET_PORTFOLIO_KEY } from "@/lib/db";
import type { RebalanceHistoryEntry, TargetPortfolio } from "@/types/target-portfolio";

/** All target portfolios (active + archived), newest updated first. */
export function useTargetPortfolios(): TargetPortfolio[] | undefined {
  return useLiveQuery(
    () => getDB().targetPortfolios.orderBy("updatedAt").reverse().toArray(),
    [],
  );
}

export function useActiveTargetPortfolioId(): string | null | undefined {
  return useLiveQuery(async () => {
    const row = await getDB().meta.get(ACTIVE_TARGET_PORTFOLIO_KEY);
    return (row?.value as string | undefined) ?? null;
  }, []);
}

export function useActiveTargetPortfolio(): TargetPortfolio | null | undefined {
  return useLiveQuery(async () => {
    const row = await getDB().meta.get(ACTIVE_TARGET_PORTFOLIO_KEY);
    const id = (row?.value as string | undefined) ?? null;
    if (!id) return null;
    return (await getDB().targetPortfolios.get(id)) ?? null;
  }, []);
}

export function useRebalanceHistory(targetPortfolioId: string | null): RebalanceHistoryEntry[] | undefined {
  return useLiveQuery(async () => {
    const rows = await getDB().rebalanceHistory.orderBy("timestamp").reverse().toArray();
    if (!targetPortfolioId) return rows;
    return rows.filter((r) => r.targetPortfolioId === targetPortfolioId);
  }, [targetPortfolioId]);
}
