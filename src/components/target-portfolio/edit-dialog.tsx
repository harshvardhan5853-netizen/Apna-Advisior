"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Plus,
  Trash2,
  Save,
  Copy,
  Archive,
  RotateCcw,
  Info,
  Wallet,
  Sparkles,
} from "lucide-react";

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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn, formatCompactINR, uid } from "@/lib/utils";
import { lookupStock } from "@/lib/enrichment/nse-static";

import type { TargetAllocation, TargetPortfolio } from "@/types/target-portfolio";
import {
  updateTargetPortfolio,
  duplicateTargetPortfolio,
  archiveTargetPortfolio,
  restoreTargetPortfolio,
  deleteTargetPortfolio,
} from "@/lib/target-store";
import { sumTargetPercent } from "@/lib/target-analytics";

interface EditTargetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: TargetPortfolio | null;
  currentValue?: number;
  onSaved?: (id: string) => void;
  onDeleted?: () => void;
}

interface DraftAllocation {
  id: string;
  symbol: string;
  stockName: string;
  sector: string | null;
  targetPercent: number;
  notes: string;
}

export function EditTargetDialog({
  open,
  onOpenChange,
  target,
  currentValue,
  onSaved,
  onDeleted,
}: EditTargetDialogProps) {
  const [name, setName] = React.useState("");
  const [allocations, setAllocations] = React.useState<DraftAllocation[]>([]);
  const [capitalStr, setCapitalStr] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open && target) {
      setName(target.name);
      setAllocations(
        target.allocations
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((a) => ({
            id: a.id,
            symbol: a.symbol,
            stockName: a.stockName,
            sector: a.sector,
            targetPercent: a.targetPercent,
            notes: a.notes ?? "",
          })),
      );
      const capital = target.totalCapitalOverride ?? (currentValue && currentValue > 0 ? currentValue : 0);
      setCapitalStr(capital > 0 ? String(Math.round(capital)) : "");
      setSaving(false);
    }
  }, [open, target, currentValue]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const total = React.useMemo(() => sumTargetPercent(allocations), [allocations]);
  const trimmedName = name.trim();
  const totalOk = Math.abs(total - 100) < 0.01;
  const canSave = trimmedName.length > 0 && allocations.length > 0 && totalOk && !saving;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setAllocations((prev) => {
      const oldIndex = prev.findIndex((a) => a.id === active.id);
      const newIndex = prev.findIndex((a) => a.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  function updateRow(id: string, patch: Partial<DraftAllocation>) {
    setAllocations((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  function removeRow(id: string) {
    setAllocations((prev) => prev.filter((a) => a.id !== id));
  }

  function addRow() {
    setAllocations((prev) => [
      ...prev,
      {
        id: uid("t"),
        symbol: "",
        stockName: "",
        sector: null,
        targetPercent: 0,
        notes: "",
      },
    ]);
  }

  function distributeEvenly() {
    if (allocations.length === 0) return;
    const each = Math.floor((100 / allocations.length) * 100) / 100;
    const remainder = Math.round((100 - each * allocations.length) * 100) / 100;
    setAllocations((prev) =>
      prev.map((a, i) => ({
        ...a,
        targetPercent: i === 0 ? each + remainder : each,
      })),
    );
  }

  async function handleSave() {
    if (!target || !canSave) return;
    setSaving(true);
    try {
      const cleaned = allocations.map((a, i) => {
        const meta = a.symbol ? lookupStock(a.symbol, a.stockName) : null;
        const symbol = (a.symbol || meta?.symbol || "").toUpperCase().trim();
        const stockName = (a.stockName || meta?.name || symbol).trim();
        return {
          id: a.id,
          order: i,
          symbol,
          stockName,
          sector: a.sector ?? meta?.sector ?? null,
          targetPercent: Math.round(a.targetPercent * 100) / 100,
          notes: a.notes.trim(),
        } satisfies TargetAllocation;
      });
      const capital = Number(capitalStr);
      const override = capitalStr.trim() && Number.isFinite(capital) && capital > 0 ? capital : null;
      await updateTargetPortfolio({
        id: target.id,
        name: trimmedName,
        allocations: cleaned,
        totalCapitalOverride: override,
      });
      toast.success(`Target “${trimmedName}” updated`);
      onSaved?.(target.id);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Couldn't save target portfolio");
      setSaving(false);
    }
  }

  async function handleDuplicate() {
    if (!target) return;
    try {
      const dup = await duplicateTargetPortfolio(target.id);
      if (dup) {
        toast.success(`Duplicated as “${dup.name}” (archived)`);
      }
    } catch {
      toast.error("Couldn't duplicate");
    }
  }

  async function handleArchive() {
    if (!target) return;
    try {
      if (target.status === "archived") {
        await restoreTargetPortfolio(target.id);
        toast.success(`Restored “${target.name}”`);
      } else {
        await archiveTargetPortfolio(target.id);
        toast.success(`Archived “${target.name}”`);
      }
      onOpenChange(false);
    } catch {
      toast.error("Couldn't change status");
    }
  }

  async function handleDelete() {
    if (!target) return;
    if (!window.confirm(`Delete “${target.name}”? This cannot be undone.`)) return;
    try {
      await deleteTargetPortfolio(target.id);
      toast.success(`Deleted “${target.name}”`);
      onDeleted?.();
      onOpenChange(false);
    } catch {
      toast.error("Couldn't delete");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl">
        <DialogHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <DialogTitle>Edit target portfolio</DialogTitle>
              <DialogDescription>
                Drag rows to reorder. Add or remove stocks. Weights must sum to 100%.
              </DialogDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  More actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={handleDuplicate}>
                  <Copy className="h-3.5 w-3.5" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleArchive}>
                  {target?.status === "archived" ? (
                    <>
                      <RotateCcw className="h-3.5 w-3.5" />
                      Restore
                    </>
                  ) : (
                    <>
                      <Archive className="h-3.5 w-3.5" />
                      Archive
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onSelect={handleDelete}>
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-[1fr_240px]">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-target-name">Portfolio name</Label>
            <Input
              id="edit-target-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder="My ideal mix"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-target-capital">Target capital (₹)</Label>
            <div className="relative">
              <Wallet className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="edit-target-capital"
                value={capitalStr}
                onChange={(e) => setCapitalStr(e.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
                placeholder="Auto"
                className="pl-9"
              />
            </div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Leave blank to auto-use your current invested value
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            {allocations.length} stocks · Sum {total.toFixed(2)}%
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={distributeEvenly} disabled={allocations.length === 0}>
              <Sparkles className="h-3.5 w-3.5" />
              Distribute evenly
            </Button>
            <Button variant="outline" size="sm" onClick={addRow}>
              <Plus className="h-3.5 w-3.5" />
              Add stock
            </Button>
            <TotalBadge total={total} />
          </div>
        </div>

        <div className="max-h-[420px] overflow-y-auto rounded-xl border border-white/[0.05] bg-white/[0.02] p-2">
          {allocations.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-6 text-center text-sm text-muted-foreground">
              <Info className="h-5 w-5 text-emerald-300/70" />
              No allocations yet. Click <span className="text-foreground">Add stock</span> to begin.
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={allocations.map((a) => a.id)} strategy={verticalListSortingStrategy}>
                <AnimatePresence initial={false}>
                  {allocations.map((a) => (
                    <SortableRow
                      key={a.id}
                      allocation={a}
                      onChange={(patch) => updateRow(a.id, patch)}
                      onRemove={() => removeRow(a.id)}
                    />
                  ))}
                </AnimatePresence>
              </SortableContext>
            </DndContext>
          )}
        </div>

        <DialogFooter>
          <div className="mr-auto text-xs text-muted-foreground">
            {currentValue !== undefined && currentValue > 0 && (
              <span>
                Currently invested: <span className="text-foreground">{formatCompactINR(currentValue)}</span>
              </span>
            )}
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave} className="shadow-glow-emerald">
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save target"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TotalBadge({ total }: { total: number }) {
  const ok = Math.abs(total - 100) < 0.01;
  const over = total > 100;
  const label = ok
    ? `Total 100% ✓`
    : over
      ? `${total.toFixed(1)}% · ${(total - 100).toFixed(1)}% over`
      : `${total.toFixed(1)}% · ${(100 - total).toFixed(1)}% short`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        ok
          ? "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200"
          : "border-amber-400/30 bg-amber-500/[0.08] text-amber-200",
      )}
    >
      {label}
    </span>
  );
}

function SortableRow({
  allocation,
  onChange,
  onRemove,
}: {
  allocation: DraftAllocation;
  onChange: (patch: Partial<DraftAllocation>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: allocation.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  function handleSymbolBlur() {
    if (!allocation.symbol) return;
    const meta = lookupStock(allocation.symbol);
    if (meta && !allocation.stockName) {
      onChange({ stockName: meta.name, sector: meta.sector });
    } else if (meta && !allocation.sector) {
      onChange({ sector: meta.sector });
    }
    onChange({ symbol: allocation.symbol.toUpperCase() });
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "mb-2 flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5",
        isDragging && "z-10 border-emerald-400/40 bg-emerald-500/[0.06] shadow-glow-emerald",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="mt-1 flex h-6 w-6 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-white/[0.05] hover:text-foreground active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="grid flex-1 gap-2 sm:grid-cols-[110px_1fr_100px]">
          <Input
            value={allocation.symbol}
            onChange={(e) => onChange({ symbol: e.target.value.toUpperCase() })}
            onBlur={handleSymbolBlur}
            placeholder="SYMBOL"
            className="h-9 font-mono text-sm uppercase"
            maxLength={20}
          />
          <Input
            value={allocation.stockName}
            onChange={(e) => onChange({ stockName: e.target.value })}
            placeholder="Company name"
            className="h-9 text-sm"
            maxLength={80}
          />
          <div className="relative">
            <Input
              value={Number.isFinite(allocation.targetPercent) ? String(allocation.targetPercent) : ""}
              onChange={(e) => {
                const v = e.target.value.replace(/[^\d.]/g, "");
                const n = Number(v);
                onChange({ targetPercent: Number.isFinite(n) ? n : 0 });
              }}
              inputMode="decimal"
              placeholder="0"
              className="h-9 pr-6 text-right text-sm"
              maxLength={6}
            />
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              %
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
          aria-label="Remove"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-2 pl-8">
        <input
          type="range"
          min={0}
          max={100}
          step={0.5}
          value={Math.min(100, Math.max(0, allocation.targetPercent))}
          onChange={(e) => onChange({ targetPercent: Number(e.target.value) })}
          className="h-1 flex-1 accent-emerald-400"
        />
        <input
          value={allocation.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Notes (optional)"
          className="h-8 w-64 rounded-md border border-white/[0.06] bg-white/[0.02] px-2 text-[12px] text-muted-foreground focus:border-emerald-400/40 focus:outline-none"
          maxLength={140}
        />
      </div>
    </motion.div>
  );
}
