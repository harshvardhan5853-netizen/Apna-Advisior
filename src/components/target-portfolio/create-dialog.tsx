"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Sparkles, Target, CheckCircle2, Layers } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { TARGET_PRESETS } from "@/lib/target-presets";
import { createTargetPortfolio } from "@/lib/target-store";
import type { TargetPresetKey, TargetPresetOption } from "@/types/target-portfolio";

interface CreateTargetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (id: string) => void;
}

export function CreateTargetDialog({ open, onOpenChange, onCreated }: CreateTargetDialogProps) {
  const [name, setName] = React.useState("");
  const [presetKey, setPresetKey] = React.useState<TargetPresetKey>("balanced");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      const t = window.setTimeout(() => {
        setName("");
        setPresetKey("balanced");
        setSaving(false);
      }, 250);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  const preset = React.useMemo(
    () => TARGET_PRESETS.find((p) => p.key === presetKey) ?? TARGET_PRESETS[0],
    [presetKey],
  );

  const total = React.useMemo(
    () => preset.allocations.reduce((s, a) => s + a.targetPercent, 0),
    [preset],
  );

  const trimmed = name.trim();
  const canSave = trimmed.length > 0 && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const portfolio = await createTargetPortfolio({
        name: trimmed,
        preset: preset.key,
        allocations: preset.allocations.map((a) => ({
          symbol: a.symbol,
          stockName: a.stockName,
          sector: a.sector,
          targetPercent: a.targetPercent,
          notes: "",
        })),
      });
      toast.success(`Target “${portfolio.name}” created`);
      onCreated?.(portfolio.id);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Couldn't create target portfolio");
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/25 bg-amber-500/[0.08] text-amber-300">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Create target portfolio</DialogTitle>
              <DialogDescription>Pick a template or start blank — you can tweak everything later.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="target-name">Portfolio name</Label>
          <Input
            id="target-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My ideal mix"
            maxLength={80}
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Template</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {TARGET_PRESETS.map((p) => (
              <PresetCard
                key={p.key}
                preset={p}
                selected={p.key === presetKey}
                onSelect={() => setPresetKey(p.key)}
              />
            ))}
          </div>
        </div>

        {preset.allocations.length > 0 && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Layers className="h-3 w-3" /> Allocation preview
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                  Math.abs(total - 100) < 0.5
                    ? "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200"
                    : "border-amber-400/30 bg-amber-500/[0.08] text-amber-200",
                )}
              >
                <CheckCircle2 className="h-3 w-3" />
                Total {total.toFixed(0)}%
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {preset.allocations.map((a) => (
                <span
                  key={`${a.symbol}-${a.stockName}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] px-2 py-1 text-[11px] text-muted-foreground"
                >
                  <span className="font-mono text-emerald-200/90">{a.symbol}</span>
                  <span className="text-white/70">{a.targetPercent}%</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave} className="shadow-glow-emerald">
            <Sparkles className="h-4 w-4" />
            {saving ? "Creating…" : "Create target"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PresetCard({
  preset,
  selected,
  onSelect,
}: {
  preset: TargetPresetOption;
  selected: boolean;
  onSelect: () => void;
}) {
  const total = preset.allocations.reduce((s, a) => s + a.targetPercent, 0);
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        "relative flex flex-col gap-2 rounded-2xl border p-3 text-left transition-colors",
        selected
          ? "border-amber-400/50 bg-amber-500/[0.06] shadow-glow-emerald"
          : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-display text-sm font-semibold text-foreground">{preset.label}</span>
        {selected && <CheckCircle2 className="h-4 w-4 text-amber-300" />}
      </div>
      <p className="text-[12px] leading-snug text-muted-foreground">{preset.description}</p>
      {preset.allocations.length > 0 && (
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {preset.allocations.length} stocks · sums to {total}%
        </div>
      )}
    </motion.button>
  );
}
