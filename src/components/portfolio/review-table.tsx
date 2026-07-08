"use client";

import * as React from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import type { Holding } from "@/types/portfolio";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn, formatINR, formatPct } from "@/lib/utils";

interface ReviewTableProps {
  holdings: Holding[];
  onChange: (next: Holding[]) => void;
}

const COLS: {
  key: keyof Holding;
  label: string;
  align?: "left" | "right";
  editable: boolean;
  format?: (v: number) => string;
}[] = [
  { key: "stockName", label: "Stock", align: "left", editable: true },
  { key: "symbol", label: "Symbol", align: "left", editable: true },
  { key: "quantity", label: "Qty", align: "right", editable: true },
  { key: "avgBuyPrice", label: "Avg", align: "right", editable: true },
  { key: "currentPrice", label: "LTP", align: "right", editable: true },
  { key: "investedAmount", label: "Invested", align: "right", editable: true, format: (v) => formatINR(v) },
  { key: "currentValue", label: "Current", align: "right", editable: true, format: (v) => formatINR(v) },
  { key: "pnl", label: "P/L", align: "right", editable: false, format: (v) => formatINR(v) },
];

export function ReviewTable({ holdings, onChange }: ReviewTableProps) {
  const updateRow = (id: string, patch: Partial<Holding>) => {
    onChange(
      holdings.map((h) => {
        if (h.id !== id) return h;
        const next = { ...h, ...patch };
        // Recompute derived fields whenever qty / prices change.
        if ("quantity" in patch || "avgBuyPrice" in patch) {
          next.investedAmount = next.quantity * next.avgBuyPrice;
        }
        if ("quantity" in patch || "currentPrice" in patch) {
          next.currentValue = next.quantity * next.currentPrice;
        }
        next.pnl = next.currentValue - next.investedAmount;
        next.pnlPercent =
          next.investedAmount > 0 ? next.pnl / next.investedAmount : 0;
        // Manually edited => user has verified.
        next.needsReview = false;
        next.confidence = 1;
        return next;
      }),
    );
  };

  const removeRow = (id: string) => onChange(holdings.filter((h) => h.id !== id));

  if (holdings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-muted-foreground">
        No holdings were extracted. Try a clearer file or add rows manually later.
      </div>
    );
  }

  return (
    <div className="max-h-[52vh] overflow-auto rounded-xl border border-white/[0.06] bg-white/[0.015]">
      <Table>
        <TableHeader>
          <TableRow>
            {COLS.map((c) => (
              <TableHead
                key={c.key as string}
                className={c.align === "right" ? "text-right" : ""}
              >
                {c.label}
              </TableHead>
            ))}
            <TableHead className="text-right">P/L %</TableHead>
            <TableHead className="w-10 text-right"> </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {holdings.map((h) => (
            <TableRow
              key={h.id}
              className={cn(
                h.needsReview &&
                  "bg-amber-500/[0.05] hover:bg-amber-500/[0.08]",
              )}
            >
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
                    {c.key === "stockName" && (
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {h.needsReview ? (
                          <Badge variant="warning" className="text-[10px] px-1.5 py-0 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Needs Review ({(h.confidence * 100).toFixed(0)}%)
                          </Badge>
                        ) : (
                          h.confidence < 1 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 text-emerald-300">
                              Auto-verified ({(h.confidence * 100).toFixed(0)}%)
                            </Badge>
                          )
                        )}
                      </div>
                    )}
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
              <TableCell className="text-right">
                <button
                  type="button"
                  onClick={() => removeRow(h.id)}
                  aria-label={`Remove ${h.stockName}`}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
