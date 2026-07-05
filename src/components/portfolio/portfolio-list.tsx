"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  ArchiveRestore,
  ArrowUpDown,
  CheckCircle2,
  Copy,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import type { Portfolio } from "@/types/portfolio";
import {
  archivePortfolio,
  deletePortfolio,
  duplicatePortfolio,
  renamePortfolio,
  restorePortfolio,
  switchActivePortfolio,
} from "@/lib/portfolio-store";
import { cn, formatCompactINR, formatDate, formatPct } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface PortfolioListProps {
  portfolios: Portfolio[];
  activeId: string | null;
}

type SortKey = "updatedAt" | "name" | "currentValue" | "pnl";

export function PortfolioList({ portfolios, activeId }: PortfolioListProps) {
  const [query, setQuery] = React.useState("");
  const [sortKey, setSortKey] = React.useState<SortKey>("updatedAt");
  const [showArchived, setShowArchived] = React.useState(false);
  const [renameTarget, setRenameTarget] = React.useState<Portfolio | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Portfolio | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = portfolios.filter((p) =>
      showArchived ? true : p.status === "active",
    );
    const searched = q
      ? base.filter((p) => p.name.toLowerCase().includes(q))
      : base;
    const sorted = [...searched].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name);
        case "currentValue":
          return b.totals.currentValue - a.totals.currentValue;
        case "pnl":
          return b.totals.pnl - a.totals.pnl;
        case "updatedAt":
        default:
          return b.updatedAt - a.updatedAt;
      }
    });
    return sorted;
  }, [portfolios, query, sortKey, showArchived]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 pl-9"
            placeholder="Search portfolios…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <ArrowUpDown className="h-3.5 w-3.5" />
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <SortItem current={sortKey} value="updatedAt" onSelect={setSortKey}>
              Recently updated
            </SortItem>
            <SortItem current={sortKey} value="name" onSelect={setSortKey}>
              Name (A–Z)
            </SortItem>
            <SortItem current={sortKey} value="currentValue" onSelect={setSortKey}>
              Total value
            </SortItem>
            <SortItem current={sortKey} value="pnl" onSelect={setSortKey}>
              Profit / Loss
            </SortItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant={showArchived ? "secondary" : "outline"}
          size="sm"
          onClick={() => setShowArchived((s) => !s)}
        >
          <Archive className="h-3.5 w-3.5" />
          {showArchived ? "All" : "Show archived"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        <AnimatePresence initial={false}>
          {filtered.map((p) => (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <PortfolioRow
                portfolio={p}
                isActive={p.id === activeId}
                onRename={() => setRenameTarget(p)}
                onDelete={() => setDeleteTarget(p)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-sm text-muted-foreground">
            No portfolios match. Try clearing the search or toggling archived.
          </div>
        )}
      </div>

      <RenameDialog target={renameTarget} onClose={() => setRenameTarget(null)} />
      <DeleteDialog target={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </div>
  );
}

function SortItem<T extends string>({
  current,
  value,
  onSelect,
  children,
}: {
  current: T;
  value: T;
  onSelect: (v: T) => void;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenuItem onSelect={() => onSelect(value)}>
      <CheckCircle2
        className={cn(
          "h-3.5 w-3.5",
          current === value ? "text-emerald-300" : "text-transparent",
        )}
      />
      {children}
    </DropdownMenuItem>
  );
}

interface PortfolioRowProps {
  portfolio: Portfolio;
  isActive: boolean;
  onRename: () => void;
  onDelete: () => void;
}

function PortfolioRow({ portfolio, isActive, onRename, onDelete }: PortfolioRowProps) {
  const totals = portfolio.totals;
  const gain = totals.pnl >= 0;

  const handleSetActive = async () => {
    try {
      await switchActivePortfolio(portfolio.id);
      toast.success(`Switched to "${portfolio.name}"`);
    } catch (err) {
      toast.error("Couldn't switch portfolio");
    }
  };

  const handleDuplicate = async () => {
    try {
      const copy = await duplicatePortfolio(portfolio.id);
      toast.success(`Duplicated as "${copy.name}"`);
    } catch (err) {
      toast.error("Duplicate failed");
    }
  };

  const handleArchive = async () => {
    try {
      await archivePortfolio(portfolio.id);
      toast.success(`Archived "${portfolio.name}"`);
    } catch (err) {
      toast.error("Archive failed");
    }
  };

  const handleRestore = async () => {
    try {
      await restorePortfolio(portfolio.id);
      toast.success(`Restored "${portfolio.name}"`);
    } catch (err) {
      toast.error("Restore failed");
    }
  };

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition-all hover:bg-white/[0.045]",
        isActive && "glow-ring bg-emerald-500/[0.06]",
        portfolio.status === "archived" && "opacity-70",
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-emerald-300">
        {isActive ? <Star className="h-4 w-4" /> : gain ? (
          <TrendingUp className="h-4 w-4" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-300" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="truncate font-medium">{portfolio.name}</div>
          {isActive && <Badge>Active</Badge>}
          {portfolio.status === "archived" && (
            <Badge variant="secondary">Archived</Badge>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          <span>{totals.holdingCount} holdings</span>
          <span>Updated {formatDate(portfolio.updatedAt)}</span>
        </div>
      </div>

      <div className="hidden text-right md:block">
        <div className="money-tabular text-sm font-semibold">
          {formatCompactINR(totals.currentValue)}
        </div>
        <div
          className={cn(
            "money-tabular text-xs",
            gain ? "text-emerald-300" : "text-red-300",
          )}
        >
          {gain ? "+" : ""}
          {formatCompactINR(totals.pnl)} · {formatPct(totals.pnlPercent)}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Portfolio actions"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{portfolio.name}</DropdownMenuLabel>
          {!isActive && (
            <DropdownMenuItem onSelect={handleSetActive}>
              <Star className="h-3.5 w-3.5" /> Set active
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={onRename}>
            <Pencil className="h-3.5 w-3.5" /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleDuplicate}>
            <Copy className="h-3.5 w-3.5" /> Duplicate
          </DropdownMenuItem>
          {portfolio.status === "active" ? (
            <DropdownMenuItem onSelect={handleArchive}>
              <Archive className="h-3.5 w-3.5" /> Archive
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={handleRestore}>
              <ArchiveRestore className="h-3.5 w-3.5" /> Restore
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onSelect={onDelete}>
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function RenameDialog({
  target,
  onClose,
}: {
  target: Portfolio | null;
  onClose: () => void;
}) {
  const [name, setName] = React.useState("");
  React.useEffect(() => setName(target?.name ?? ""), [target]);
  const open = target !== null;

  const submit = async () => {
    if (!target) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await renamePortfolio(target.id, trimmed);
      toast.success("Renamed");
      onClose();
    } catch (err) {
      toast.error("Rename failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Rename portfolio</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({
  target,
  onClose,
}: {
  target: Portfolio | null;
  onClose: () => void;
}) {
  const open = target !== null;
  const submit = async () => {
    if (!target) return;
    try {
      await deletePortfolio(target.id);
      toast.success("Deleted");
      onClose();
    } catch (err) {
      toast.error("Delete failed");
    }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Delete portfolio?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          This will permanently remove <span className="font-medium text-foreground">
            {target?.name}
          </span> and all of its holdings. This cannot be undone.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={submit}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
