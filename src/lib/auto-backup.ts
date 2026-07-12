/**
 * Auto-backup on portfolio change.
 *
 * Every write operation (create, merge, delete) triggers a debounced
 * full-data snapshot stored in localStorage. This protects against
 * IndexedDB being silently cleared by the browser.
 *
 * Limits: keeps the last 5 snapshots to stay within localStorage quota.
 */
import { getDB } from "./db";

const BACKUP_KEY = "apna-advisor.auto-backup-snapshots.v1";
const MAX_SNAPSHOTS = 5;
const DEBOUNCE_MS = 3000;

interface AutoSnapshot {
  id: string;
  timestamp: number;
  label: string;
  data: unknown;
}

let timer: ReturnType<typeof setTimeout> | null = null;
let pendingLabel = "";

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

async function takeSnapshot(label: string): Promise<void> {
  try {
    const db = getDB();
    const [portfolios, mergeHistory, targetPortfolios] = await Promise.all([
      db.portfolios.toArray(),
      db.mergeHistory.toArray(),
      db.targetPortfolios.toArray(),
    ]);

    const snapshot: AutoSnapshot = {
      id: `bak_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      label,
      data: { portfolios, mergeHistory, targetPortfolios },
    };

    // Load existing snapshots, prepend new one, trim to max
    const raw = localStorage.getItem(BACKUP_KEY);
    const existing: AutoSnapshot[] = raw ? JSON.parse(raw) : [];
    existing.unshift(snapshot);
    if (existing.length > MAX_SNAPSHOTS) existing.length = MAX_SNAPSHOTS;
    localStorage.setItem(BACKUP_KEY, JSON.stringify(existing));

    // Update last-backup timestamp for the auto-backup UI
    const ts = new Date(snapshot.timestamp);
    const stamp = `${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}`;
    localStorage.setItem("apna-advisor.auto-backup-timestamp.v1", stamp);
  } catch (err) {
    console.error("[auto-backup] snapshot failed:", err);
  }
}

/**
 * Schedule a debounced auto-backup.
 * Call this after every portfolio write operation.
 */
export function triggerAutoBackup(label: string): void {
  pendingLabel = label;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    const lbl = pendingLabel;
    pendingLabel = "";
    timer = null;
    takeSnapshot(lbl);
  }, DEBOUNCE_MS);
}

export function listAutoBackups(): AutoSnapshot[] {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function restoreFromAutoBackup(snapshotId: string): Promise<boolean> {
  const backups = listAutoBackups();
  const snap = backups.find((b) => b.id === snapshotId);
  if (!snap) throw new Error("Backup snapshot not found");

  const { portfolios, mergeHistory, targetPortfolios } = snap.data as {
    portfolios: unknown[];
    mergeHistory: unknown[];
    targetPortfolios: unknown[];
  };

  const db = getDB();
  await db.transaction("rw", db.portfolios, db.mergeHistory, db.targetPortfolios, async () => {
    await db.portfolios.clear();
    await db.mergeHistory.clear();
    await db.targetPortfolios.clear();
    if (portfolios.length > 0) await db.portfolios.bulkAdd(portfolios as never[]);
    if (mergeHistory.length > 0) await db.mergeHistory.bulkAdd(mergeHistory as never[]);
    if (targetPortfolios.length > 0) await db.targetPortfolios.bulkAdd(targetPortfolios as never[]);
  });
  return true;
}

export async function needsRecovery(): Promise<boolean> {
  try {
    const db = getDB();
    const count = await db.portfolios.count();
    const backups = listAutoBackups();
    return count === 0 && backups.length > 0;
  } catch {
    return false;
  }
}
