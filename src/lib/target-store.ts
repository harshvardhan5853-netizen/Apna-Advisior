import { getDB, getActiveTargetPortfolioId, setActiveTargetPortfolioId, ACTIVE_TARGET_PORTFOLIO_KEY } from "@/lib/db";
import type {
  RebalanceHistoryEntry,
  RebalanceSummary,
  TargetAllocation,
  TargetPortfolio,
  TargetPortfolioStatus,
  TargetPresetKey,
} from "@/types/target-portfolio";
import { uid } from "@/lib/utils";

/**
 * All target-portfolio write operations are wrapped in Dexie transactions
 * so the active-id meta row stays consistent with the portfolios table.
 */

export interface CreateTargetPortfolioInput {
  name: string;
  allocations: Omit<TargetAllocation, "id" | "order">[];
  preset?: TargetPresetKey | null;
  totalCapitalOverride?: number | null;
}

export interface UpdateTargetPortfolioInput {
  id: string;
  name?: string;
  allocations?: TargetAllocation[];
  totalCapitalOverride?: number | null;
}

function stampAllocations(allocations: Omit<TargetAllocation, "id" | "order">[]): TargetAllocation[] {
  return allocations.map((a, index) => ({
    ...a,
    id: uid("t"),
    order: index,
    notes: a.notes ?? "",
  }));
}

function trimName(name: string): string {
  const t = name.trim();
  return t.length ? t.slice(0, 80) : "Untitled target";
}

export async function createTargetPortfolio(input: CreateTargetPortfolioInput): Promise<TargetPortfolio> {
  const db = getDB();
  const now = Date.now();
  const portfolio: TargetPortfolio = {
    id: uid("tp"),
    name: trimName(input.name),
    status: "active",
    createdAt: now,
    updatedAt: now,
    totalCapitalOverride: input.totalCapitalOverride ?? null,
    allocations: stampAllocations(input.allocations),
    origin: { preset: input.preset ?? null },
  };
  await db.transaction("rw", db.targetPortfolios, db.meta, async () => {
    await db.targetPortfolios.put(portfolio);
    await db.meta.put({ key: ACTIVE_TARGET_PORTFOLIO_KEY, value: portfolio.id });
  });
  return portfolio;
}

export async function updateTargetPortfolio(input: UpdateTargetPortfolioInput): Promise<TargetPortfolio> {
  const db = getDB();
  return await db.transaction("rw", db.targetPortfolios, async () => {
    const existing = await db.targetPortfolios.get(input.id);
    if (!existing) throw new Error(`Target portfolio ${input.id} not found`);
    const nextAllocations = input.allocations
      ? input.allocations.map((a, i) => ({ ...a, order: i, notes: a.notes ?? "" }))
      : existing.allocations;
    const updated: TargetPortfolio = {
      ...existing,
      name: input.name !== undefined ? trimName(input.name) : existing.name,
      totalCapitalOverride:
        input.totalCapitalOverride !== undefined ? input.totalCapitalOverride : existing.totalCapitalOverride,
      allocations: nextAllocations,
      updatedAt: Date.now(),
    };
    await db.targetPortfolios.put(updated);
    return updated;
  });
}

export async function renameTargetPortfolio(id: string, name: string): Promise<void> {
  const db = getDB();
  await db.transaction("rw", db.targetPortfolios, async () => {
    const existing = await db.targetPortfolios.get(id);
    if (!existing) return;
    existing.name = trimName(name);
    existing.updatedAt = Date.now();
    await db.targetPortfolios.put(existing);
  });
}

export async function deleteTargetPortfolio(id: string): Promise<void> {
  const db = getDB();
  await db.transaction("rw", db.targetPortfolios, db.meta, async () => {
    await db.targetPortfolios.delete(id);
    const activeId = await getActiveTargetPortfolioId();
    if (activeId === id) {
      const remaining = await db.targetPortfolios.filter((p) => p.status === "active").first();
      await db.meta.put({ key: ACTIVE_TARGET_PORTFOLIO_KEY, value: remaining?.id ?? null });
    }
  });
}

export async function duplicateTargetPortfolio(id: string): Promise<TargetPortfolio | null> {
  const db = getDB();
  return await db.transaction("rw", db.targetPortfolios, async () => {
    const existing = await db.targetPortfolios.get(id);
    if (!existing) return null;
    const now = Date.now();
    const clone: TargetPortfolio = {
      ...JSON.parse(JSON.stringify(existing)),
      id: uid("tp"),
      name: `${existing.name} (Copy)`,
      status: "archived",
      createdAt: now,
      updatedAt: now,
    };
    // Re-stamp allocation ids so they don't collide.
    clone.allocations = clone.allocations.map((a: TargetAllocation, i: number) => ({
      ...a,
      id: uid("t"),
      order: i,
    }));
    await db.targetPortfolios.put(clone);
    return clone;
  });
}

/**
 * Snapshot the given target as an archived version so the user can restore
 * or compare against it later. Reuses the archive tier of the target list.
 */
export async function saveTargetVersion(id: string, label?: string): Promise<TargetPortfolio | null> {
  const db = getDB();
  return await db.transaction("rw", db.targetPortfolios, async () => {
    const existing = await db.targetPortfolios.get(id);
    if (!existing) return null;
    const now = Date.now();
    const stamp = new Date(now).toISOString().slice(0, 16).replace("T", " ");
    const suffix = label && label.trim().length > 0 ? label.trim().slice(0, 40) : `Saved ${stamp}`;
    const snapshot: TargetPortfolio = {
      ...JSON.parse(JSON.stringify(existing)),
      id: uid("tp"),
      name: `${existing.name} — ${suffix}`,
      status: "archived",
      createdAt: now,
      updatedAt: now,
    };
    snapshot.allocations = snapshot.allocations.map((a: TargetAllocation, i: number) => ({
      ...a,
      id: uid("t"),
      order: i,
    }));
    await db.targetPortfolios.put(snapshot);
    return snapshot;
  });
}

export async function archiveTargetPortfolio(id: string): Promise<void> {
  await setStatus(id, "archived");
}

export async function restoreTargetPortfolio(id: string): Promise<void> {
  await setStatus(id, "active");
}

async function setStatus(id: string, status: TargetPortfolioStatus): Promise<void> {
  const db = getDB();
  await db.transaction("rw", db.targetPortfolios, db.meta, async () => {
    const existing = await db.targetPortfolios.get(id);
    if (!existing) return;
    existing.status = status;
    existing.updatedAt = Date.now();
    await db.targetPortfolios.put(existing);
    if (status === "archived") {
      const activeId = await getActiveTargetPortfolioId();
      if (activeId === id) {
        const remaining = await db.targetPortfolios.filter((p) => p.status === "active" && p.id !== id).first();
        await db.meta.put({ key: ACTIVE_TARGET_PORTFOLIO_KEY, value: remaining?.id ?? null });
      }
    }
  });
}

export async function switchActiveTargetPortfolio(id: string): Promise<void> {
  const db = getDB();
  await db.transaction("rw", db.targetPortfolios, db.meta, async () => {
    const existing = await db.targetPortfolios.get(id);
    if (!existing) return;
    if (existing.status === "archived") {
      existing.status = "active";
      existing.updatedAt = Date.now();
      await db.targetPortfolios.put(existing);
    }
    await db.meta.put({ key: ACTIVE_TARGET_PORTFOLIO_KEY, value: id });
  });
}

export async function listTargetPortfolios(): Promise<TargetPortfolio[]> {
  const db = getDB();
  return db.targetPortfolios.orderBy("updatedAt").reverse().toArray();
}

export async function getTargetPortfolio(id: string): Promise<TargetPortfolio | null> {
  const db = getDB();
  return (await db.targetPortfolios.get(id)) ?? null;
}

export interface LogRebalanceInput {
  target: TargetPortfolio;
  summary: RebalanceSummary;
  note?: string;
}

export async function logRebalance(input: LogRebalanceInput): Promise<RebalanceHistoryEntry> {
  const db = getDB();
  const entry: RebalanceHistoryEntry = {
    id: uid("rh"),
    targetPortfolioId: input.target.id,
    targetName: input.target.name,
    timestamp: Date.now(),
    alignmentScore: input.summary.alignmentScore,
    totalCapital: input.summary.totalCapital,
    underweightSum: input.summary.underweightSum,
    overweightSum: input.summary.overweightSum,
    netCashRequired: input.summary.netCashRequired,
    matchedCount: input.summary.matchedCount,
    rowCount:
      input.summary.onTargetCount +
      input.summary.underAllocatedCount +
      input.summary.overAllocatedCount,
    note: input.note?.trim().slice(0, 200) ?? "",
  };
  await db.rebalanceHistory.put(entry);
  return entry;
}

export async function listRebalanceHistory(targetPortfolioId?: string): Promise<RebalanceHistoryEntry[]> {
  const db = getDB();
  const rows = await db.rebalanceHistory.orderBy("timestamp").reverse().toArray();
  if (!targetPortfolioId) return rows;
  return rows.filter((r) => r.targetPortfolioId === targetPortfolioId);
}

export async function deleteRebalanceEntry(id: string): Promise<void> {
  const db = getDB();
  await db.rebalanceHistory.delete(id);
}

export async function clearRebalanceHistory(targetPortfolioId?: string): Promise<void> {
  const db = getDB();
  if (!targetPortfolioId) {
    await db.rebalanceHistory.clear();
    return;
  }
  const ids = await db.rebalanceHistory
    .filter((r) => r.targetPortfolioId === targetPortfolioId)
    .primaryKeys();
  await db.rebalanceHistory.bulkDelete(ids);
}

export { getActiveTargetPortfolioId, setActiveTargetPortfolioId, ACTIVE_TARGET_PORTFOLIO_KEY };
