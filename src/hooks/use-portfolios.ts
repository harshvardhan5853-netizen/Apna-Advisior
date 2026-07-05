"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDB, getActivePortfolioId } from "@/lib/db";
import { listMergeHistory } from "@/lib/portfolio-store";
import type { Portfolio, MergeHistoryEntry } from "@/types/portfolio";

/** All portfolios (active + archived), newest updated first. */
export function usePortfolios(): Portfolio[] | undefined {
  return useLiveQuery(
    () => getDB().portfolios.orderBy("updatedAt").reverse().toArray(),
    [],
  );
}

export function useActivePortfolioId(): string | null | undefined {
  return useLiveQuery(async () => {
    const row = await getDB().meta.get("activePortfolioId");
    return (row?.value as string | undefined) ?? null;
  }, []);
}

export function useActivePortfolio(): Portfolio | null | undefined {
  return useLiveQuery(async () => {
    const id = await getActivePortfolioId();
    if (!id) return null;
    return (await getDB().portfolios.get(id)) ?? null;
  }, []);
}

export function useMergeHistory(): MergeHistoryEntry[] | undefined {
  return useLiveQuery(() => listMergeHistory(), []);
}
