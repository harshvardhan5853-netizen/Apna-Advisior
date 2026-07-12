"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  GitMerge,
  ListRestart,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { Holding } from "@/types/portfolio";
import type { HoldingValidation } from "@/lib/validation-engine";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatINR, formatPct } from "@/lib/utils";

interface ReviewTableProps {
  holdings: Holding[];
  onChange: React.Dispatch<React.SetStateAction<Holding[]>>;
  validationResults?: HoldingValidation[];
  /** Show bulk action toolbar + checkbox column. Default false. */
  showBulkActions?: boolean;
  /** Called when user clicks "Import Selected". */
  onBulkImport?: (ids: string[]) => void;
  /** Called when user clicks "Discard Selected". */
  onBulkDiscard?: (ids: string[]) => void;
  /** True if a bulk import is in progress. */
  bulkImporting?: boolean;
  /** Existing holdings (for merge-preview mode). When set, shows "New" vs "Merged" badges. */
  existingHoldings?: Holding[];
}

type StatusFilter = "all" | "valid" | "issues" | "needs-review" | "low-confidence";

const COLS: {
  key: keyof Holding;
  label: string;
  align?: "left" | "right";
  editable: boolean;
  format?: (v: number) => string;
}[] = [
  { key: "symbol", label: "Symbol", align: "left", editable: true },
  { key: "quantity", label: "Qty", align: "right", editable: true },
  { key: "avgBuyPrice", label: "Avg", align: "right", editable: true },
  { key: "currentPrice", label: "LTP", align: "right", editable: true },
  { key: "investedAmount", label: "Invested", align: "right", editable: true, format: (v) => formatINR(v) },
  { key: "currentValue", label: "Current", align: "right", editable: true, format: (v) => formatINR(v) },
  { key: "pnl", label: "P/L", align: "right", editable: false, format: (v) => formatINR(v) },
];

interface RowStatus {
  label: string;
  variant: "success" | "warning" | "danger";
  tooltip: string;
}

function getRowStatus(h: Holding, validation?: HoldingValidation): RowStatus[] {
  const statuses: RowStatus[] = [];

  if (!validation) {
    return [{ label: "No Data", variant: "warning", tooltip: "Validation data not available for this holding." }];
  }

  // Empty data — no issues means valid
  if (
    validation.criticalErrors.length === 0 &&
    validation.unknownSymbols.length === 0 &&
    validation.missingRequiredFields.length === 0 &&
    validation.errors.length === 0 &&
    validation.warnings.length === 0 &&
    h.confidence >= 0.95
  ) {
    return [{ label: "Valid", variant: "success", tooltip: "All checks passed." }];
  }

  // Critical errors first (red)
  for (const ce of validation.criticalErrors) {
    if (ce.toLowerCase().includes("symbol") || ce.toLowerCase().includes("empty") || ce.toLowerCase().includes("unknown")) {
      statuses.push({ label: "Unknown Symbol", variant: "danger", tooltip: ce });
    } else if (ce.toLowerCase().includes("qty") || ce.toLowerCase().includes("quantit")) {
      statuses.push({ label: "Missing Quantity", variant: "danger", tooltip: ce });
    } else if (ce.toLowerCase().includes("price") || ce.toLowerCase().includes("avg") || ce.toLowerCase().includes("ltp")) {
      statuses.push({ label: "Invalid Price", variant: "danger", tooltip: ce });
    } else if (ce.toLowerCase().includes("invested") || ce.toLowerCase().includes("current")) {
      statuses.push({ label: "Financial Mismatch", variant: "danger", tooltip: ce });
    } else {
      statuses.push({ label: "Validation Error", variant: "danger", tooltip: ce });
    }
  }

  // non-critical errors (amber)
  for (const err of validation.errors) {
    if (!validation.criticalErrors.includes(err)) {
      if (err.toLowerCase().includes("invested")) {
        statuses.push({ label: "Missing Invested Value", variant: "warning", tooltip: err });
      } else if (err.toLowerCase().includes("current")) {
        statuses.push({ label: "Missing Current Value", variant: "warning", tooltip: err });
      } else if (err.toLowerCase().includes("pnl")) {
        statuses.push({ label: "Financial Mismatch", variant: "warning", tooltip: err });
      } else if (err.toLowerCase().includes("unusua")) {
        statuses.push({ label: "Unusual Value", variant: "warning", tooltip: err });
      } else {
        statuses.push({ label: "Warning", variant: "warning", tooltip: err });
      }
    }
  }

  // missing required fields
  for (const f of validation.missingRequiredFields) {
    if (!statuses.some((s) => s.label.toLowerCase().includes(f.toLowerCase()))) {
      const label = f === "quantity" ? "Missing Quantity"
        : f === "avgBuyPrice" || f === "currentPrice" ? "Invalid Price"
        : f === "investedAmount" ? "Missing Invested Value"
        : f === "currentValue" ? "Missing Current Value"
        : `Missing ${f}`;
      statuses.push({ label, variant: "warning", tooltip: `${f} could not be extracted. Please verify manually.` });
    }
  }

  // Unknown symbols
  for (const sym of validation.unknownSymbols) {
    if (!statuses.some((s) => s.label === "Unknown Symbol")) {
      statuses.push({ label: "Unknown Symbol", variant: "danger", tooltip: `"${sym}" is not in our NSE symbol list. Verify and correct.` });
    }
  }

  // Low confidence
  if (h.confidence < 0.7 && !statuses.some((s) => s.label === "Low Confidence")) {
    statuses.push({ label: "Low Confidence", variant: "warning", tooltip: `Confidence ${(h.confidence * 100).toFixed(0)}% is below threshold. Review details.` });
  }

  // Deduplicate labels (keep first occurrence)
  const seen = new Set<string>();
  return statuses.filter((s) => {
    if (seen.has(s.label)) return false;
    seen.add(s.label);
    return true;
  });
}

const BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline" | "warning"> = {
  success: "default",
  warning: "warning",
  danger: "destructive",
};

/** Merge key: prefer symbol, fall back to normalized stock name. */
function mergeKey(h: Holding): string {
  const sym = (h.symbol || "").trim().toUpperCase();
  if (sym) return `SYM:${sym}`;
  return `NAME:${(h.stockName || "").trim().toUpperCase()}`;
}

export function ReviewTable({
  holdings,
  onChange,
  validationResults,
  showBulkActions = false,
  onBulkImport,
  onBulkDiscard,
  bulkImporting = false,
  existingHoldings,
}: ReviewTableProps) {
  /* ── search & filter state ── */
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");

  /* ── bulk selection state ── */
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  /* ── undo state ── */
  const undoRef = React.useRef<{ holdings: Holding[]; timeout: ReturnType<typeof setTimeout> | null }>({ holdings: [], timeout: null });

  // Clear selection when holdings change (re-parsed)
  React.useEffect(() => {
    setSelectedIds(new Set());
  }, [holdings.length]);

  /* ── helpers ── */

  const updateRow = (id: string, patch: Partial<Holding>) => {
    onChange((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        const next = { ...h, ...patch };
        if ("quantity" in patch || "avgBuyPrice" in patch) {
          next.investedAmount = next.quantity * next.avgBuyPrice;
        }
        if ("quantity" in patch || "currentPrice" in patch) {
          next.currentValue = next.quantity * next.currentPrice;
        }
        next.pnl = next.currentValue - next.investedAmount;
        next.pnlPercent =
          next.investedAmount > 0 ? next.pnl / next.investedAmount : 0;
        next.needsReview = false;
        next.confidence = 1;
        return next;
      }),
    );
  };

  const removeRow = (id: string) => {
    const removed = holdings.find((h) => h.id === id);
    if (!removed) return;
    onChange((prev) => prev.filter((h) => h.id !== id));
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });

    // Show undo toast
    toast("Row removed", {
      description: `${removed.symbol || removed.stockName || "Holding"} removed.`,
      action: {
        label: "Undo",
        onClick: () => {
          onChange((prev) => [...prev, removed]);
        },
      },
      duration: 5000,
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((h) => h.id)));
    }
  };

  const discardSelected = () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    const snapshot = holdings.filter((h) => selectedIds.has(h.id));
    onChange((prev) => prev.filter((h) => !selectedIds.has(h.id)));
    setSelectedIds(new Set());

    toast(`${count} row${count > 1 ? "s" : ""} discarded`, {
      action: {
        label: "Undo",
        onClick: () => onChange((prev) => [...prev, ...snapshot]),
      },
      duration: 6000,
    });
  };

  /* ── derive status for a holding ── */
  function getPrimaryStatus(h: Holding, v?: HoldingValidation): "valid" | "issues" | "needs-review" | "low-confidence" | null {
    if (!v) return null;
    const hasIssues = v.criticalErrors.length > 0 || v.errors.length > 0 || v.unknownSymbols.length > 0 || v.missingRequiredFields.length > 0;
    if (hasIssues) return "issues";
    if (h.needsReview) return "needs-review";
    if (h.confidence < 0.7) return "low-confidence";
    return "valid";
  }

  /* ── merge preview ── */
  const existingKeys = React.useMemo(() => {
    if (!existingHoldings) return null;
    const keys = new Set<string>();
    for (const h of existingHoldings) keys.add(mergeKey(h));
    return keys;
  }, [existingHoldings]);

  const mergePreview = React.useMemo(() => {
    if (!existingKeys) return null;
    let added = 0;
    let merged = 0;
    for (const h of holdings) {
      if (existingKeys.has(mergeKey(h))) merged++;
      else added++;
    }
    return { added, merged };
  }, [holdings, existingKeys]);

  /* ── filter & search ── */
  const q = searchQuery.toLowerCase().trim();
  const filtered = React.useMemo(() => {
    return holdings.filter((h) => {
      // Text search
      if (q) {
        const matches =
          (h.symbol && h.symbol.toLowerCase().includes(q)) ||
          (h.stockName && h.stockName.toLowerCase().includes(q));
        if (!matches) return false;
      }
      // Status filter
      if (statusFilter !== "all") {
        const v = (validationResults ?? []).find((vr) => vr.holdingId === h.id);
        const status = getPrimaryStatus(h, v);
        if (status !== statusFilter) return false;
      }
      return true;
    });
  }, [holdings, q, statusFilter, validationResults]);

  /* ── render ── */

  if (holdings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-muted-foreground">
        No holdings were extracted. Try a clearer file or add rows manually later.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* ── Search + Filter toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by symbol or name…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9 text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="h-9 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-foreground outline-none focus:border-emerald-400/60"
          >
            <option value="all">All</option>
            <option value="valid">Valid</option>
            <option value="issues">Issues</option>
            <option value="needs-review">Needs Review</option>
            <option value="low-confidence">Low Confidence</option>
          </select>
        </div>
      </div>

      {/* ── Merge preview bar ── */}
      {mergePreview && (
        <div className="flex items-center gap-2 rounded-xl border border-indigo-400/20 bg-indigo-500/[0.06] px-3 py-2 text-sm">
          <GitMerge className="h-4 w-4 text-indigo-300" />
          <span className="text-muted-foreground">
            <span className="font-semibold text-foreground">{mergePreview.added}</span> new holding{mergePreview.added !== 1 ? "s" : ""} will be added,&nbsp;
            <span className="font-semibold text-foreground">{mergePreview.merged}</span> duplicate{mergePreview.merged !== 1 ? "s" : ""} will be merged
          </span>
        </div>
      )}

      {/* ── Bulk action bar ── */}
      {showBulkActions && selectedIds.size > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.06] px-3 py-2 text-sm">
          <span className="text-muted-foreground">
            <span className="font-semibold text-foreground">{selectedIds.size}</span> selected
          </span>
          <div className="ml-auto flex items-center gap-2">
            {onBulkImport && (
              <button
                type="button"
                onClick={() => onBulkImport([...selectedIds])}
                disabled={bulkImporting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-400 transition-colors disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                Import Selected
              </button>
            )}
            {onBulkDiscard && (
              <button
                type="button"
                onClick={discardSelected}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-white/[0.06] hover:text-foreground transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Discard Selected
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="max-h-[52vh] overflow-auto rounded-xl border border-white/[0.06] bg-white/[0.015]">
        <Table>
          <TableHeader>
            <TableRow>
              {showBulkActions && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onCheckedChange={selectAll}
                    aria-label={selectedIds.size === filtered.length ? "Deselect all" : "Select all"}
                  />
                </TableHead>
              )}
              {COLS.map((c) => (
                <TableHead
                  key={c.key as string}
                  className={c.align === "right" ? "text-right" : ""}
                >
                  {c.label}
                </TableHead>
              ))}
              <TableHead className="text-right">P/L %</TableHead>
              <TableHead className="text-center">Conf.</TableHead>
              <TableHead className="text-left">Status</TableHead>
              <TableHead className="w-10 text-right"> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((h) => {
              const v = (validationResults ?? []).find((vr) => vr.holdingId === h.id);
              const statuses = getRowStatus(h, v);
              const hasIssues = statuses.length > 0 && statuses[0].label !== "Valid";
              return (
                <TableRow
                  key={h.id}
                  className={cn(
                    hasIssues && "bg-amber-500/[0.05] hover:bg-amber-500/[0.08]",
                    h.needsReview && !hasIssues && "bg-amber-500/[0.03]",
                  )}
                >
                  {showBulkActions && (
                    <TableCell className="w-10">
                      <Checkbox
                        checked={selectedIds.has(h.id)}
                        onCheckedChange={() => toggleSelect(h.id)}
                        aria-label={`Select ${h.symbol || h.stockName}`}
                      />
                    </TableCell>
                  )}
                  {COLS.map((c) => {
                    const raw = h[c.key];
                    if (!c.editable) {
                      const val = typeof raw === "number" ? (c.format ? c.format(raw) : raw) : String(raw);
                      return (
                        <TableCell
                          key={c.key as string}
                          className={cn(
                            "money-tabular",
                            c.align === "right" && "text-right",
                            c.key === "pnl" &&
                              typeof raw === "number" &&
                              (raw >= 0 ? "text-emerald-300" : "text-red-300"),
                          )}
                        >
                          {val}
                        </TableCell>
                      );
                    }
                    return (
                      <TableCell
                        key={c.key as string}
                        className={cn("p-1.5", c.align === "right" && "text-right")}
                      >
                        <EditableCell
                          value={raw as string | number}
                          numeric={typeof raw === "number"}
                          align={c.align}
                          onCommit={(v) => {
                            const bag: Record<string, string | number> = {};
                            if (typeof raw === "number") {
                              const n = Number(v);
                              if (!Number.isFinite(n)) return;
                              bag[c.key as string] = n;
                            } else {
                              bag[c.key as string] = String(v);
                            }
                            updateRow(h.id, bag as Partial<Holding>);
                          }}
                        />
                      </TableCell>
                    );
                  })}
                  <TableCell
                    className={cn(
                      "money-tabular text-right",
                      h.pnl >= 0 ? "text-emerald-300" : "text-red-300",
                    )}
                  >
                    {formatPct(h.pnlPercent)}
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                        h.confidence >= 0.95
                          ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/20"
                          : h.confidence >= 0.7
                            ? "bg-amber-400/10 text-amber-300 border border-amber-400/20"
                            : "bg-red-400/10 text-red-300 border border-red-400/20",
                      )}
                    >
                      {(h.confidence * 100).toFixed(0)}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1 min-w-[80px]">
                      {existingKeys && (
                        existingKeys.has(mergeKey(h))
                          ? <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-medium bg-amber-400/10 text-amber-300 border border-amber-400/20 cursor-default whitespace-nowrap">Merged</span>
                          : <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-medium bg-emerald-400/10 text-emerald-300 border border-emerald-400/20 cursor-default whitespace-nowrap">New</span>
                      )}
                      {statuses.length === 0 ? (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      ) : (
                        statuses.map((s, i) => (
                          <span
                            key={i}
                            title={s.tooltip}
                            className={cn(
                              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-medium cursor-default whitespace-nowrap",
                              s.variant === "success"
                                ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/20"
                                : s.variant === "danger"
                                  ? "bg-red-400/10 text-red-300 border border-red-400/20"
                                  : "bg-amber-400/10 text-amber-300 border border-amber-400/20",
                            )}
                          >
                            {s.variant === "success" ? (
                              <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />
                            ) : s.variant === "danger" ? (
                              <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                            ) : (
                              <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                            )}
                            {s.label}
                          </span>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      type="button"
                      onClick={() => removeRow(h.id)}
                      aria-label={`Remove ${h.symbol}`}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* ── Results summary ── */}
      {filtered.length < holdings.length && (
        <div className="text-center text-[11px] text-muted-foreground">
          Showing {filtered.length} of {holdings.length} holding{holdings.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}

interface EditableCellProps {
  value: string | number;
  numeric?: boolean;
  align?: "left" | "right";
  onCommit: (v: string | number) => void;
}
function EditableCell({ value, numeric, align, onCommit }: EditableCellProps) {
  const [draft, setDraft] = React.useState(String(value ?? ""));
  React.useEffect(() => setDraft(String(value ?? "")), [value]);
  return (
    <input
      className={cn(
        "w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-sm outline-none transition-colors focus:border-emerald-400/40 focus:bg-white/[0.04]",
        "money-tabular",
        align === "right" && "text-right",
      )}
      value={draft}
      inputMode={numeric ? "decimal" : "text"}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => onCommit(numeric ? Number(draft) : draft)}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}
