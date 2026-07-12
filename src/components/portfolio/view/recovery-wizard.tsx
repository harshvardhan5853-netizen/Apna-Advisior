"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, HardDriveUpload, Loader2, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { listAutoBackups, restoreFromAutoBackup, needsRecovery } from "@/lib/auto-backup";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";

interface RecoveryBackup {
  id: string;
  label: string;
  timestamp: number;
  portfolioCount: number;
  holdingCount: number;
}

export function RecoveryWizard() {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [needsRestore, setNeedsRestore] = React.useState(false);
  const [backups, setBackups] = React.useState<RecoveryBackup[]>([]);
  const [restoring, setRestoring] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const shouldShow = await needsRecovery();
        if (cancelled) return;
        setNeedsRestore(shouldShow);
        if (shouldShow) {
          const raw = listAutoBackups();
          const parsed: RecoveryBackup[] = raw.map((b) => {
            const data = b.data as { portfolios?: Array<{ holdings?: unknown[] }> };
            const holdings = data?.portfolios?.reduce((acc, p) => acc + (p.holdings?.length ?? 0), 0) ?? 0;
            return {
              id: b.id,
              label: b.label,
              timestamp: b.timestamp,
              portfolioCount: data?.portfolios?.length ?? 0,
              holdingCount: holdings,
            };
          });
          setBackups(parsed);
        }
      } catch {
        // ignore — recovery check is best-effort
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleRestore = async (id: string) => {
    setRestoring(id);
    try {
      await restoreFromAutoBackup(id);
      toast.success("Portfolio restored from auto-backup");
      setNeedsRestore(false);
      setOpen(false);
      // Reload the page so all components pick up fresh data
      window.location.reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Restore failed";
      toast.error(msg);
    } finally {
      setRestoring(null);
    }
  };

  if (loading || !needsRestore) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-amber-400/20 bg-amber-500/[0.06] p-4"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10">
            <AlertTriangle className="h-5 w-5 text-amber-300" />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <div className="font-semibold text-amber-100">Portfolio data appears to be missing</div>
            <p className="text-sm text-muted-foreground">
              We found {backups.length} auto-backup{backups.length > 1 ? "s" : ""} in local storage.
              Your IndexedDB might have been cleared. Would you like to restore from a backup?
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setOpen(true)}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Restore from backup
              </Button>
              <Button size="sm" variant="outline" onClick={() => setNeedsRestore(false)}>
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HardDriveUpload className="h-5 w-5 text-emerald-300" />
              Restore from auto-backup
            </DialogTitle>
            <DialogDescription>
              Auto-backups capture your full portfolio state. Choose a snapshot to restore.
              Current data will be replaced.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            {backups.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{b.label}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {formatTimestamp(b.timestamp)} &middot; {b.portfolioCount} portfolio{b.portfolioCount !== 1 ? "s" : ""} &middot; {b.holdingCount} holding{b.holdingCount !== 1 ? "s" : ""}
                  </div>
                </div>
                <Button
                  size="sm"
                  disabled={restoring === b.id}
                  onClick={() => handleRestore(b.id)}
                >
                  {restoring === b.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Restore"
                  )}
                </Button>
              </div>
            ))}
          </div>

          <DialogFooter className="text-xs text-muted-foreground">
            Auto-backups are stored in your browser&apos;s local storage.
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
