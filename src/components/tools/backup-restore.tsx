"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Database, Download, Upload, AlertTriangle, Check, ShieldCheck, Table2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { getDB } from "@/lib/db";
import { cn, formatDate, formatNumber } from "@/lib/utils";

const NEWS_SETTINGS_KEY = "apna-advisor.news-settings.v1";
const LAST_BACKUP_KEY = "apna-advisor.last-backup.v1";
const AUTO_BACKUP_KEY = "apna-advisor.auto-backup.v1";

interface AutoBackupPref {
  enabled: boolean;
  intervalDays: number; // 1 | 7 | 30
}

const AUTO_BACKUP_INTERVALS = [
  { value: 1, label: "Daily" },
  { value: 7, label: "Weekly" },
  { value: 30, label: "Monthly" },
] as const;

function loadAutoBackupPref(): AutoBackupPref {
  try {
    const raw = localStorage.getItem(AUTO_BACKUP_KEY);
    if (raw) return JSON.parse(raw) as AutoBackupPref;
  } catch { /* fall through */ }
  return { enabled: false, intervalDays: 7 };
}

function saveAutoBackupPref(pref: AutoBackupPref): void {
  localStorage.setItem(AUTO_BACKUP_KEY, JSON.stringify(pref));
}

interface BackupCounts {
  portfolios: number;
  mergeHistory: number;
  targetPortfolios: number;
  rebalanceHistory: number;
  opportunityCache: number;
  meta: number;
}

interface BackupBlob {
  schemaVersion: number;
  exportedAt: number;
  tables: {
    portfolios: unknown[];
    mergeHistory: unknown[];
    targetPortfolios: unknown[];
    rebalanceHistory: unknown[];
    opportunityCache: unknown[];
    meta: unknown[];
  };
  localStorage: {
    newsSettings: string | null;
  };
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function backupFilename(): string {
  const now = new Date();
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `apna-advisor-backup-${stamp}.json`;
}

async function readCounts(): Promise<BackupCounts> {
  const db = getDB();
  const [portfolios, mergeHistory, targetPortfolios, rebalanceHistory, opportunityCache, meta] = await Promise.all([
    db.portfolios.count(),
    db.mergeHistory.count(),
    db.targetPortfolios.count(),
    db.rebalanceHistory.count(),
    db.opportunityCache.count(),
    db.meta.count(),
  ]);
  return { portfolios, mergeHistory, targetPortfolios, rebalanceHistory, opportunityCache, meta };
}

async function buildBackup(): Promise<BackupBlob> {
  const db = getDB();
  const [portfolios, mergeHistory, targetPortfolios, rebalanceHistory, opportunityCache, meta] = await Promise.all([
    db.portfolios.toArray(),
    db.mergeHistory.toArray(),
    db.targetPortfolios.toArray(),
    db.rebalanceHistory.toArray(),
    db.opportunityCache.toArray(),
    db.meta.toArray(),
  ]);
  return {
    schemaVersion: 4,
    exportedAt: Date.now(),
    tables: { portfolios, mergeHistory, targetPortfolios, rebalanceHistory, opportunityCache, meta },
    localStorage: {
      newsSettings: typeof window !== "undefined" ? window.localStorage.getItem(NEWS_SETTINGS_KEY) : null,
    },
  };
}

function isValidBackup(x: unknown): x is BackupBlob {
  if (!x || typeof x !== "object") return false;
  const obj = x as Record<string, unknown>;
  if (typeof obj.schemaVersion !== "number") return false;
  if (typeof obj.exportedAt !== "number") return false;
  const t = obj.tables as Record<string, unknown> | undefined;
  if (!t) return false;
  const required = ["portfolios", "mergeHistory", "targetPortfolios", "rebalanceHistory", "opportunityCache", "meta"];
  for (const k of required) {
    if (!Array.isArray(t[k])) return false;
  }
  return true;
}

async function restoreBackup(blob: BackupBlob): Promise<void> {
  const db = getDB();
  await db.transaction(
    "rw",
    [db.portfolios, db.mergeHistory, db.targetPortfolios, db.rebalanceHistory, db.opportunityCache, db.meta],
    async () => {
      await Promise.all([
        db.portfolios.clear(),
        db.mergeHistory.clear(),
        db.targetPortfolios.clear(),
        db.rebalanceHistory.clear(),
        db.opportunityCache.clear(),
        db.meta.clear(),
      ]);
      await Promise.all([
        db.portfolios.bulkPut(blob.tables.portfolios as never[]),
        db.mergeHistory.bulkPut(blob.tables.mergeHistory as never[]),
        db.targetPortfolios.bulkPut(blob.tables.targetPortfolios as never[]),
        db.rebalanceHistory.bulkPut(blob.tables.rebalanceHistory as never[]),
        db.opportunityCache.bulkPut(blob.tables.opportunityCache as never[]),
        db.meta.bulkPut(blob.tables.meta as never[]),
      ]);
    },
  );
  if (typeof window !== "undefined" && blob.localStorage?.newsSettings) {
    window.localStorage.setItem(NEWS_SETTINGS_KEY, blob.localStorage.newsSettings);
  }
}

export function BackupRestore() {
  const [counts, setCounts] = React.useState<BackupCounts | null>(null);
  const [lastBackup, setLastBackup] = React.useState<number | null>(null);
  const [exporting, setExporting] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const [autoBackup, setAutoBackup] = React.useState<AutoBackupPref>(loadAutoBackupPref);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const refreshCounts = React.useCallback(async () => {
    try {
      const next = await readCounts();
      setCounts(next);
    } catch (err) {
      console.error(err);
    }
  }, []);

  React.useEffect(() => {
    void refreshCounts();
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem(LAST_BACKUP_KEY);
      const parsed = raw ? Number(raw) : NaN;
      if (Number.isFinite(parsed)) setLastBackup(parsed);
    }
  }, [refreshCounts]);

  /* Auto-backup: run on mount if enabled and past due */
  React.useEffect(() => {
    if (!autoBackup.enabled) return;
    const raw = window.localStorage.getItem(LAST_BACKUP_KEY);
    const lastExport = raw ? Number(raw) : 0;
    if (!Number.isFinite(lastExport)) return;
    const elapsed = Date.now() - lastExport;
    const threshold = autoBackup.intervalDays * 86400 * 1000;
    if (elapsed >= threshold) {
      (async () => {
        try {
          const blob = await buildBackup();
          const json = JSON.stringify(blob, null, 2);
          const file = new Blob([json], { type: "application/json" });
          const url = URL.createObjectURL(file);
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = backupFilename();
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          URL.revokeObjectURL(url);
          const ts = Date.now();
          window.localStorage.setItem(LAST_BACKUP_KEY, String(ts));
          setLastBackup(ts);
          toast.success("Auto-backup downloaded");
        } catch {
          toast.error("Auto-backup failed");
        }
      })();
    }
  }, [autoBackup]);

  const handleExport = React.useCallback(async () => {
    setExporting(true);
    try {
      const blob = await buildBackup();
      const json = JSON.stringify(blob, null, 2);
      const file = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(file);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = backupFilename();
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      const ts = Date.now();
      if (typeof window !== "undefined") window.localStorage.setItem(LAST_BACKUP_KEY, String(ts));
      setLastBackup(ts);
      toast.success("Backup file downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Could not build backup");
    } finally {
      setExporting(false);
    }
  }, []);

  const handleFilePick = React.useCallback(async (file: File) => {
    // Validate file first, then show dialog
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      if (!isValidBackup(parsed)) {
        toast.error("Invalid or corrupted backup file");
        return;
      }
      setPendingFile(file);
      setConfirmOpen(true);
    } catch (err) {
      toast.error("Could not read backup file");
    }
  }, []);

  const executeRestore = React.useCallback(async () => {
    if (!pendingFile) return;
    setConfirmOpen(false);
    setImporting(true);
    try {
      const text = await pendingFile.text();
      const parsed = JSON.parse(text) as unknown;
      if (!isValidBackup(parsed)) {
        toast.error("Invalid backup file");
        return;
      }
      await restoreBackup(parsed);
      await refreshCounts();
      toast.success("Backup restored — reloading");
      setTimeout(() => {
        if (typeof window !== "undefined") window.location.reload();
      }, 800);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Could not restore backup");
    } finally {
      setImporting(false);
      setPendingFile(null);
    }
  }, [pendingFile, refreshCounts]);

  const handleImportClick = React.useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const totalRecords = counts
    ? counts.portfolios + counts.mergeHistory + counts.targetPortfolios + counts.rebalanceHistory + counts.opportunityCache + counts.meta
    : 0;

  return (
    <div className="space-y-8">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-xl"
      >
        <header className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/[0.14] text-teal-200">
            <Database className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-semibold">Your data snapshot</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Everything Apna Advisor stores lives inside your browser. Take a snapshot before switching devices or clearing browser data.
            </p>
          </div>
        </header>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Tile label="Portfolios" value={counts ? formatNumber(counts.portfolios) : "—"} />
          <Tile label="Targets" value={counts ? formatNumber(counts.targetPortfolios) : "—"} />
          <Tile label="Rebalance log" value={counts ? formatNumber(counts.rebalanceHistory) : "—"} />
          <Tile label="Merge history" value={counts ? formatNumber(counts.mergeHistory) : "—"} />
          <Tile label="Opportunity cache" value={counts ? formatNumber(counts.opportunityCache) : "—"} />
          <Tile label="Preferences" value={counts ? formatNumber(counts.meta) : "—"} />
        </div>

        {/* ── Auto-backup toggle ── */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.04] bg-white/[0.02] px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={autoBackup.enabled}
              onClick={() => {
                const next = { ...autoBackup, enabled: !autoBackup.enabled };
                setAutoBackup(next);
                saveAutoBackupPref(next);
              }}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40",
                "disabled:cursor-not-allowed disabled:opacity-50",
                autoBackup.enabled ? "bg-emerald-500" : "bg-white/[0.08]",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200",
                  autoBackup.enabled ? "translate-x-[18px]" : "translate-x-0.5",
                )}
              />
            </button>
            <div>
              <div className="text-sm font-medium leading-tight">
                {autoBackup.enabled ? "Auto-backup active" : "Auto-backup"}
              </div>
              {autoBackup.enabled ? (
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="text-xs text-emerald-300/60">Every</span>
                  <select
                    value={autoBackup.intervalDays}
                    onChange={(e) => {
                      const next = { ...autoBackup, intervalDays: Number(e.target.value) };
                      setAutoBackup(next);
                      saveAutoBackupPref(next);
                    }}
                    className="cursor-pointer appearance-none rounded-lg border border-white/[0.06] bg-white/[0.04] px-2 py-0.5 text-xs text-emerald-200/80 hover:border-white/[0.12] focus:outline-none"
                  >
                    {AUTO_BACKUP_INTERVALS.map((i) => (
                      <option key={i.value} value={i.value} className="bg-[#0d1815]">
                        {i.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Download a fresh snapshot automatically</p>
              )}
            </div>
          </div>
          {lastBackup ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-teal-400/25 bg-teal-500/[0.08] px-2 py-0.5 text-xs text-teal-100">
              <Check className="h-3 w-3" /> Last export {formatDate(lastBackup)}
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {counts
              ? `${formatNumber(totalRecords)} record(s) across ${Object.keys(counts).length} table(s).`
              : "Reading database…"}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleImportClick} disabled={importing}>
              <Upload className="mr-2 h-3.5 w-3.5" />
              {importing ? "Restoring…" : "Restore from file"}
            </Button>
            <Button variant="default" size="sm" onClick={handleExport} disabled={exporting}>
              <Download className="mr-2 h-3.5 w-3.5" />
              {exporting ? "Preparing…" : "Download backup"}
            </Button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void handleFilePick(file);
          }}
        />
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-xl"
      >
        <header className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/[0.14] text-emerald-200">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold">What&apos;s inside the backup</h2>
            <p className="mt-1 text-sm text-muted-foreground">Plain JSON — human readable, portable, versioned.</p>
          </div>
        </header>

        <ul className="mt-4 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
          <Bullet>Every portfolio and all its holdings (name, symbol, quantity, avg buy, sector, tags, notes).</Bullet>
          <Bullet>Merge history and portfolio activity log so undo still works after restore.</Bullet>
          <Bullet>Every target portfolio, its allocations, and every saved version.</Bullet>
          <Bullet>Rebalance history (alignment score + cash-flow snapshot at each applied rebalance).</Bullet>
          <Bullet>Opportunity finder analysis cache (avoids re-hitting Screener + Yahoo on restore).</Bullet>
          <Bullet>News settings including your Gemini key and auto-refresh interval.</Bullet>
        </ul>

        <div className={cn(
          "mt-6 flex items-start gap-2 rounded-2xl border p-3 text-xs",
          "border-amber-400/20 bg-amber-500/[0.06] text-amber-100",
        )}>
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Restore is destructive: it replaces every table in this browser. Keep the last backup file safe before importing an older
            snapshot, and do not share the JSON if it contains your Gemini API key.
          </p>
        </div>
      </motion.section>

      {/* ── Restore confirmation dialog ── */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Restore backup?</DialogTitle>
            <DialogDescription>
              This will <span className="font-semibold text-amber-200">replace every table</span> in
              your browser&apos;s database with the contents of this backup file.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Table2 className="h-3.5 w-3.5" />
              Tables being replaced
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-sm">
              {counts && (
                <>
                  <div className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-2">
                    <span className="text-muted-foreground">Portfolios</span>
                    <span className="font-medium">{formatNumber(counts.portfolios)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-2">
                    <span className="text-muted-foreground">Targets</span>
                    <span className="font-medium">{formatNumber(counts.targetPortfolios)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-2">
                    <span className="text-muted-foreground">Merge history</span>
                    <span className="font-medium">{formatNumber(counts.mergeHistory)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-2">
                    <span className="text-muted-foreground">Rebalance logs</span>
                    <span className="font-medium">{formatNumber(counts.rebalanceHistory)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-2">
                    <span className="text-muted-foreground">Opportunity cache</span>
                    <span className="font-medium">{formatNumber(counts.opportunityCache)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-2">
                    <span className="text-muted-foreground">Preferences</span>
                    <span className="font-medium">{formatNumber(counts.meta)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-2xl border border-amber-400/20 bg-amber-500/[0.06] p-3 text-xs text-amber-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Current data will be permanently deleted. Make sure the backup file is from your latest export before continuing.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setConfirmOpen(false); setPendingFile(null); }}>
              Cancel
            </Button>
            <Button variant="default" size="sm" onClick={executeRestore} className="bg-amber-500/20 text-amber-200 hover:bg-amber-500/30">
              <Upload className="mr-2 h-3.5 w-3.5" />
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TileProps {
  label: string;
  value: string;
}

function Tile({ label, value }: TileProps) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-lg font-semibold money-tabular">{value}</div>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 rounded-2xl border border-white/[0.05] bg-white/[0.02] p-3">
      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
      <span>{children}</span>
    </li>
  );
}
