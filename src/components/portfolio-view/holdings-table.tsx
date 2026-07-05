"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Info,
  Layers,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  cn,
  formatINR,
  formatNumber,
  formatPct,
} from "@/lib/utils";
import type { CombinedHolding } from "@/types/portfolio";

type ColumnGroup =
  | "portfolio"
  | "stock"
  | "position"
  | "holding"
  | "fundamentals"
  | "technical"
  | "risk";

type NumericSlot = "number" | "money" | "percent";

interface ColumnDef {
  key: string;
  header: string;
  group: ColumnGroup;
  align?: "left" | "right";
  minWidth?: number;
  slot?: NumericSlot;
  defaultVisible?: boolean;
  enrichment?: boolean;
  accessor: (h: CombinedHolding) => string | number | null;
  render?: (h: CombinedHolding, value: string | number | null) => React.ReactNode;
}

const RUPEE = (v: number | null | undefined) =>
  typeof v === "number" && Number.isFinite(v) ? formatINR(v) : "—";
const RUPEE_PRECISE = (v: number | null | undefined) =>
  typeof v === "number" && Number.isFinite(v) ? formatINR(v, true) : "—";
const NUM = (v: number | null | undefined) =>
  typeof v === "number" && Number.isFinite(v) ? formatNumber(v) : "—";
const PCT_FRACTION = (v: number | null | undefined) =>
  typeof v === "number" && Number.isFinite(v) ? formatPct(v) : "—";

const COLUMNS: ColumnDef[] = [
  // ── Portfolio Info ──────────────────────────────────────────
  {
    key: "sources",
    header: "Portfolio",
    group: "portfolio",
    align: "left",
    minWidth: 140,
    defaultVisible: true,
    accessor: (h) => h.sources.map((s) => s.portfolioName).join(", "),
    render: (h) => {
      if (h.sources.length === 0) {
        return <span className="text-muted-foreground">—</span>;
      }
      if (h.sources.length === 1) {
        return <span className="truncate">{h.sources[0].portfolioName}</span>;
      }
      return (
        <div className="flex items-center gap-1.5">
          <Layers className="h-3 w-3 text-emerald-300" />
          <span className="truncate">{h.sources[0].portfolioName}</span>
          <Badge variant="outline" className="h-4 px-1 text-[9px]">
            +{h.sources.length - 1}
          </Badge>
        </div>
      );
    },
  },
  {
    key: "importedAt",
    header: "Imported",
    group: "portfolio",
    align: "right",
    minWidth: 100,
    slot: "number",
    defaultVisible: false,
    accessor: (h) => h.importedAt ?? 0,
    render: (h) => {
      const ts = h.importedAt ?? h.sources[0]?.dateImported ?? 0;
      if (!ts) return <span className="text-muted-foreground">—</span>;
      return <span className="money-tabular text-xs">{new Date(ts).toLocaleDateString("en-IN")}</span>;
    },
  },
  // ── Stock Info ──────────────────────────────────────────────
  {
    key: "stockName",
    header: "Stock",
    group: "stock",
    align: "left",
    minWidth: 200,
    defaultVisible: true,
    accessor: (h) => h.stockName,
    render: (h) => (
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-emerald-400/25 bg-emerald-500/[0.08] text-[10px] font-semibold text-emerald-200">
          {(h.symbol || h.stockName || "?").slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-foreground">{h.stockName}</div>
          <div className="truncate text-[10px] text-muted-foreground">
            {h.symbol || "—"} {h.exchange !== "UNKNOWN" ? "· " + h.exchange : ""}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: "symbol",
    header: "Symbol",
    group: "stock",
    align: "left",
    minWidth: 90,
    defaultVisible: true,
    accessor: (h) => h.symbol,
    render: (h) =>
      h.symbol ? (
        <span className="font-mono text-xs text-foreground">{h.symbol}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: "exchange",
    header: "Exch.",
    group: "stock",
    align: "left",
    minWidth: 70,
    defaultVisible: false,
    accessor: (h) => h.exchange,
    render: (h) => (
      <Badge variant={h.exchange === "UNKNOWN" ? "outline" : "secondary"} className="text-[10px]">
        {h.exchange}
      </Badge>
    ),
  },
  {
    key: "sector",
    header: "Sector",
    group: "stock",
    align: "left",
    minWidth: 140,
    defaultVisible: true,
    accessor: (h) => h.sector ?? "",
    render: (h) => (h.sector ? h.sector : <span className="text-muted-foreground">—</span>),
  },
  {
    key: "industry",
    header: "Industry",
    group: "stock",
    align: "left",
    minWidth: 160,
    defaultVisible: false,
    accessor: (h) => h.industry ?? "",
    render: (h) => (h.industry ? h.industry : <span className="text-muted-foreground">—</span>),
  },
  {
    key: "marketCap",
    header: "Market cap",
    group: "stock",
    align: "left",
    minWidth: 100,
    defaultVisible: true,
    accessor: (h) => h.marketCap ?? "Unknown",
    render: (h) => {
      const mc = h.marketCap ?? "Unknown";
      const tone =
        mc === "Large"
          ? "bg-emerald-500/[0.12] border-emerald-400/30 text-emerald-200"
          : mc === "Mid"
            ? "bg-cyan-500/[0.10] border-cyan-400/30 text-cyan-200"
            : mc === "Small"
              ? "bg-amber-500/[0.10] border-amber-400/30 text-amber-200"
              : "bg-white/[0.03] border-white/10 text-muted-foreground";
      return (
        <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px]", tone)}>
          {mc}
        </span>
      );
    },
  },
  // ── User Investment ─────────────────────────────────────────
  {
    key: "quantity",
    header: "Qty",
    group: "position",
    align: "right",
    minWidth: 70,
    slot: "number",
    defaultVisible: true,
    accessor: (h) => h.quantity,
    render: (h) => <span className="money-tabular">{NUM(h.quantity)}</span>,
  },
  {
    key: "avgBuyPrice",
    header: "Avg buy",
    group: "position",
    align: "right",
    minWidth: 100,
    slot: "money",
    defaultVisible: true,
    accessor: (h) => h.avgBuyPrice,
    render: (h) => <span className="money-tabular">{RUPEE_PRECISE(h.avgBuyPrice)}</span>,
  },
  {
    key: "investedAmount",
    header: "Invested",
    group: "position",
    align: "right",
    minWidth: 110,
    slot: "money",
    defaultVisible: true,
    accessor: (h) => h.investedAmount,
    render: (h) => <span className="money-tabular">{RUPEE(h.investedAmount)}</span>,
  },
  // ── Holding Info ────────────────────────────────────────────
  {
    key: "currentPrice",
    header: "LTP",
    group: "holding",
    align: "right",
    minWidth: 100,
    slot: "money",
    defaultVisible: true,
    accessor: (h) => h.currentPrice,
    render: (h) => <span className="money-tabular">{RUPEE_PRECISE(h.currentPrice)}</span>,
  },
  {
    key: "currentValue",
    header: "Current value",
    group: "holding",
    align: "right",
    minWidth: 120,
    slot: "money",
    defaultVisible: true,
    accessor: (h) => h.currentValue,
    render: (h) => <span className="money-tabular">{RUPEE(h.currentValue)}</span>,
  },
  {
    key: "pnl",
    header: "P&L",
    group: "holding",
    align: "right",
    minWidth: 110,
    slot: "money",
    defaultVisible: true,
    accessor: (h) => h.pnl,
    render: (h) => (
      <span className={cn("money-tabular font-medium", h.pnl >= 0 ? "text-emerald-300" : "text-red-400")}>
        {RUPEE(h.pnl)}
      </span>
    ),
  },
  {
    key: "pnlPercent",
    header: "Return %",
    group: "holding",
    align: "right",
    minWidth: 90,
    slot: "percent",
    defaultVisible: true,
    accessor: (h) => h.pnlPercent,
    render: (h) => (
      <span className={cn("money-tabular", h.pnlPercent >= 0 ? "text-emerald-300" : "text-red-400")}>
        {PCT_FRACTION(h.pnlPercent)}
      </span>
    ),
  },
  {
    key: "allocationPercent",
    header: "Alloc %",
    group: "holding",
    align: "right",
    minWidth: 90,
    slot: "percent",
    defaultVisible: true,
    accessor: (h) => h.allocationPercent,
    render: (h) => <span className="money-tabular">{h.allocationPercent.toFixed(2)}%</span>,
  },
  {
    key: "dayPnl",
    header: "Today's P&L",
    group: "holding",
    align: "right",
    minWidth: 100,
    slot: "money",
    defaultVisible: false,
    accessor: (h) => h.dayPnl ?? null,
    render: (h) =>
      h.dayPnl == null ? (
        <span className="text-[10px] text-muted-foreground">Live pending</span>
      ) : (
        <span className={cn("money-tabular", h.dayPnl >= 0 ? "text-emerald-300" : "text-red-400")}>
          {RUPEE(h.dayPnl)}
        </span>
      ),
  },
  {
    key: "confidence",
    header: "Confidence",
    group: "holding",
    align: "right",
    minWidth: 90,
    slot: "percent",
    defaultVisible: false,
    accessor: (h) => h.confidence,
    render: (h) => (
      <div className="flex items-center justify-end gap-1.5">
        <div className="h-1.5 w-14 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-emerald-400"
            style={{ width: `${Math.max(0, Math.min(1, h.confidence)) * 100}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground">
          {(h.confidence * 100).toFixed(0)}%
        </span>
      </div>
    ),
  },
  // ── Fundamentals (AI dataset · enrichment) ──────────────────
  ...fundamentalCol("pe", "PE"),
  ...fundamentalCol("pb", "PB"),
  ...fundamentalCol("peg", "PEG"),
  ...fundamentalCol("divYield", "Div yield"),
  ...fundamentalCol("roe", "ROE"),
  ...fundamentalCol("roce", "ROCE"),
  ...fundamentalCol("eps", "EPS"),
  ...fundamentalCol("revGrowth", "Rev growth"),
  ...fundamentalCol("profitGrowth", "Profit growth"),
  ...fundamentalCol("debtEquity", "Debt/Equity"),
  ...fundamentalCol("promoterHolding", "Promoter hldg"),
  ...fundamentalCol("promoterPledge", "Promoter pledge"),
  // ── Technical (AI dataset · enrichment) ─────────────────────
  ...technicalCol("rsi", "RSI"),
  ...technicalCol("macd", "MACD"),
  ...technicalCol("sma20", "SMA 20"),
  ...technicalCol("sma50", "SMA 50"),
  ...technicalCol("sma200", "SMA 200"),
  ...technicalCol("ema20", "EMA 20"),
  ...technicalCol("ema50", "EMA 50"),
  ...technicalCol("ema200", "EMA 200"),
  ...technicalCol("volume", "Volume"),
  ...technicalCol("avgVolume", "Avg volume"),
  ...technicalCol("supportLevel", "Support"),
  ...technicalCol("resistanceLevel", "Resistance"),
  ...technicalCol("high52w", "52W high"),
  ...technicalCol("low52w", "52W low"),
  // ── Risk (AI dataset · enrichment) ──────────────────────────
  ...riskCol("beta", "Beta"),
  ...riskCol("volatility", "Volatility"),
  ...riskCol("drawdownFromHigh", "Drawdown"),
];

function fundamentalCol(key: keyof NonNullable<CombinedHolding["fundamentals"]>, header: string): ColumnDef[] {
  return [
    {
      key: `fund_${String(key)}`,
      header,
      group: "fundamentals",
      align: "right",
      minWidth: 90,
      slot: "number",
      defaultVisible: false,
      enrichment: true,
      accessor: (h) => h.fundamentals?.[key] ?? null,
      render: (h) => {
        const v = h.fundamentals?.[key];
        if (v == null) return <span className="text-[10px] text-muted-foreground">—</span>;
        return <span className="money-tabular">{formatNumber(v)}</span>;
      },
    },
  ];
}
function technicalCol(key: keyof NonNullable<CombinedHolding["technical"]>, header: string): ColumnDef[] {
  return [
    {
      key: `tech_${String(key)}`,
      header,
      group: "technical",
      align: "right",
      minWidth: 90,
      slot: "number",
      defaultVisible: false,
      enrichment: true,
      accessor: (h) => h.technical?.[key] ?? null,
      render: (h) => {
        const v = h.technical?.[key];
        if (v == null) return <span className="text-[10px] text-muted-foreground">—</span>;
        return <span className="money-tabular">{formatNumber(v)}</span>;
      },
    },
  ];
}
function riskCol(key: keyof NonNullable<CombinedHolding["risk"]>, header: string): ColumnDef[] {
  return [
    {
      key: `risk_${String(key)}`,
      header,
      group: "risk",
      align: "right",
      minWidth: 90,
      slot: "number",
      defaultVisible: false,
      enrichment: true,
      accessor: (h) => h.risk?.[key] ?? null,
      render: (h) => {
        const v = h.risk?.[key];
        if (v == null) return <span className="text-[10px] text-muted-foreground">—</span>;
        return <span className="money-tabular">{formatNumber(v)}</span>;
      },
    },
  ];
}

const GROUP_LABELS: Record<ColumnGroup, string> = {
  portfolio: "Portfolio info",
  stock: "Stock info",
  position: "User investment",
  holding: "Holding info",
  fundamentals: "Fundamentals (AI dataset)",
  technical: "Technical (AI dataset)",
  risk: "Risk (AI dataset)",
};

type SortDir = "asc" | "desc";
type SortState = { key: string; dir: SortDir } | null;

interface HoldingsTableProps {
  holdings: CombinedHolding[];
  onSelectHolding: (id: string) => void;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function HoldingsTable({ holdings, onSelectHolding }: HoldingsTableProps) {
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<SortState>({ key: "currentValue", dir: "desc" });
  const [visible, setVisible] = React.useState<Set<string>>(() => {
    const s = new Set<string>();
    for (const c of COLUMNS) {
      if (c.defaultVisible) s.add(c.key);
    }
    return s;
  });
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);

  const visibleColumns = React.useMemo(
    () => COLUMNS.filter((c) => visible.has(c.key)),
    [visible],
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return holdings;
    return holdings.filter((h) => {
      return (
        h.stockName.toLowerCase().includes(q) ||
        h.symbol.toLowerCase().includes(q) ||
        (h.sector ?? "").toLowerCase().includes(q) ||
        (h.industry ?? "").toLowerCase().includes(q) ||
        h.sources.some((s) => s.portfolioName.toLowerCase().includes(q))
      );
    });
  }, [holdings, query]);

  const sorted = React.useMemo(() => {
    if (!sort) return filtered;
    const col = COLUMNS.find((c) => c.key === sort.key);
    if (!col) return filtered;
    const dir = sort.dir === "asc" ? 1 : -1;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = col.accessor(a);
      const bv = col.accessor(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv), "en", { numeric: true }) * dir;
    });
    return copy;
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, currentPage, pageSize]);

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const toggleSort = React.useCallback((key: string) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "desc" };
      if (prev.dir === "desc") return { key, dir: "asc" };
      return null;
    });
  }, []);

  const toggleColumn = React.useCallback((key: string) => {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const resetColumns = React.useCallback(() => {
    const s = new Set<string>();
    for (const c of COLUMNS) if (c.defaultVisible) s.add(c.key);
    setVisible(s);
  }, []);

  const showAllEnrichment = React.useCallback(() => {
    setVisible((prev) => {
      const next = new Set(prev);
      for (const c of COLUMNS) if (c.enrichment) next.add(c.key);
      return next;
    });
  }, []);

  return (
    <div className="glass relative overflow-hidden p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-display text-base font-semibold">Holdings</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {holdings.length} unique stocks · {visibleColumns.length} of {COLUMNS.length} columns visible
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search stock, symbol, sector…"
              className="h-9 w-64 pl-9"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-white/5 hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <ColumnPicker
            visible={visible}
            onToggle={toggleColumn}
            onReset={resetColumns}
            onShowAllEnrichment={showAllEnrichment}
          />
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.05]">
        <table className="w-full border-collapse text-[13px]">
          <thead className="bg-[hsl(158_28%_10%)]/95">
              <tr className="border-b border-white/[0.08]">
                {visibleColumns.map((col) => {
                  const isActive = sort?.key === col.key;
                  return (
                    <th
                      key={col.key}
                      scope="col"
                      className={cn(
                        "px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",
                        col.align === "right" ? "text-right" : "text-left",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-1 py-0.5 transition-colors hover:text-foreground",
                          col.align === "right" && "flex-row-reverse",
                          isActive && "text-emerald-200",
                        )}
                      >
                        {col.header}
                        {isActive ? (
                          sort?.dir === "asc" ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length}
                    className="px-3 py-16 text-center text-xs text-muted-foreground"
                  >
                    No holdings match this filter.
                  </td>
                </tr>
              ) : (
                pageRows.map((h, i) => (
                  <HoldingRow
                    key={h.id}
                    holding={h}
                    columns={visibleColumns}
                    onClick={onSelectHolding}
                    index={i}
                  />
                ))
              )}
            </tbody>
          </table>
      </div>

      <div className="mt-3 flex flex-col items-center justify-between gap-3 text-xs text-muted-foreground md:flex-row">
        <div>
          Showing <span className="text-foreground">{pageRows.length}</span> of{" "}
          <span className="text-foreground">{sorted.length}</span>
          {holdings.length !== sorted.length && (
            <>
              {" "}
              (filtered from <span className="text-foreground">{holdings.length}</span>)
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5">
            <span>Rows per page</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="cursor-pointer rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-xs text-foreground outline-none"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n} className="bg-[hsl(158_28%_10%)]">
                  {n}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              aria-label="Previous page"
              className="h-7 w-7"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="min-w-[64px] text-center">
              Page {currentPage} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              aria-label="Next page"
              className="h-7 w-7"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

const HoldingRow = React.memo(function HoldingRow({
  holding,
  columns,
  onClick,
  index,
}: {
  holding: CombinedHolding;
  columns: ColumnDef[];
  onClick: (id: string) => void;
  index: number;
}) {
  return (
    <motion.tr
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(0.15, index * 0.01) }}
      onClick={() => onClick(holding.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(holding.id);
        }
      }}
      className={cn(
        "cursor-pointer border-b border-white/[0.04] transition-colors hover:bg-white/[0.03]",
        holding.needsReview && "bg-amber-500/[0.03] hover:bg-amber-500/[0.06]",
      )}
    >
      {columns.map((col) => {
        const value = col.accessor(holding);
        return (
          <td
            key={col.key}
            className={cn(
              "px-2 py-2 text-[13px]",
              col.align === "right" ? "text-right" : "text-left",
            )}
          >
            {col.render ? col.render(holding, value) : <span>{String(value ?? "—")}</span>}
          </td>
        );
      })}
    </motion.tr>
  );
});

interface ColumnPickerProps {
  visible: Set<string>;
  onToggle: (key: string) => void;
  onReset: () => void;
  onShowAllEnrichment: () => void;
}

function ColumnPicker({ visible, onToggle, onReset, onShowAllEnrichment }: ColumnPickerProps) {
  const grouped = React.useMemo(() => {
    const map: Partial<Record<ColumnGroup, ColumnDef[]>> = {};
    for (const c of COLUMNS) {
      const arr = map[c.group] ?? [];
      arr.push(c);
      map[c.group] = arr;
    }
    return map;
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Columns3 className="h-4 w-4" /> Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-[70vh] w-72 overflow-y-auto p-1"
      >
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="px-0 text-[10px]">Visible columns</DropdownMenuLabel>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={onReset} className="h-6 px-2 text-[10px]">
              Reset
            </Button>
            <Button size="sm" variant="ghost" onClick={onShowAllEnrichment} className="h-6 px-2 text-[10px]">
              Show all
            </Button>
          </div>
        </div>
        <DropdownMenuSeparator />
        {(Object.keys(GROUP_LABELS) as ColumnGroup[]).map((group) => {
          const cols = grouped[group] ?? [];
          if (cols.length === 0) return null;
          const isEnrichment = group === "fundamentals" || group === "technical" || group === "risk";
          return (
            <div key={group} className="px-1 py-1">
              <div className="mb-1 flex items-center gap-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {GROUP_LABELS[group]}
                {isEnrichment && (
                  <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-1.5 py-0.5 text-[8px] font-medium text-emerald-200">
                    <Info className="h-2.5 w-2.5" />
                    Coming soon: enrichment
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                {cols.map((c) => (
                  <label
                    key={c.key}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs hover:bg-white/[0.04]"
                  >
                    <Checkbox
                      checked={visible.has(c.key)}
                      onCheckedChange={() => onToggle(c.key)}
                    />
                    <span className="flex-1 truncate">{c.header}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
