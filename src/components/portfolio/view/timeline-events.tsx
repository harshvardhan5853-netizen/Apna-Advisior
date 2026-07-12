"use client";

import * as React from "react";
import { GitMerge, Plus, Clock } from "lucide-react";
import { cn, formatINR } from "@/lib/utils";
import type { MergeHistoryEntry } from "@/types/portfolio";
import { listMergeHistory } from "@/lib/portfolio-store";

interface TimelineEventsProps {
  portfolioId?: string | "all";
  max?: number;
}

function formatDate(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function formatTime(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function daysAgo(ts: number): string {
  const diff = Date.now() - ts;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function TimelineEvents({ portfolioId, max = 20 }: TimelineEventsProps) {
  const [events, setEvents] = React.useState<MergeHistoryEntry[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    listMergeHistory()
      .then((entries) => {
        let filtered = entries;
        if (portfolioId && portfolioId !== "all") {
          filtered = entries.filter((e) => {
            if (e.action.type === "merge") return e.action.targetPortfolioId === portfolioId;
            if (e.action.type === "create") return e.action.portfolioId === portfolioId;
            return true;
          });
        }
        setEvents(filtered.slice(0, max));
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [portfolioId, max]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
        <Clock className="h-3.5 w-3.5 animate-pulse" />
        Loading events…
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        No merge events yet
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <HistoryIcon className="h-3.5 w-3.5" />
        <span>Portfolio timeline ({events.length} event{events.length !== 1 ? "s" : ""})</span>
      </div>
      <div className="relative -mx-1 flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
        {events.map((ev, i) => (
          (() => {
            if (ev.action.type === "merge") {
              const a = ev.action;
              return (
                <div
                  key={ev.id}
                  className={cn(
                    "relative flex shrink-0 flex-col gap-1.5 rounded-xl border px-3 py-2 min-w-[160px] max-w-[220px] border-indigo-400/15 bg-indigo-500/[0.04]",
                    i < events.length - 1 && "after:absolute after:-right-1.5 after:top-1/2 after:h-2 after:w-2 after:-translate-y-1/2 after:rounded-full after:border after:border-white/10 after:bg-white/[0.03]",
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <GitMerge className="h-3 w-3 text-indigo-300" />
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {formatDate(ev.timestamp)}
                    </span>
                    <span className="ml-auto text-[9px] text-muted-foreground">
                      {daysAgo(ev.timestamp)}
                    </span>
                  </div>
                  <div className="text-[11px] leading-tight text-foreground line-clamp-2">
                    {ev.description}
                  </div>
                  {(a.addedHoldingIds?.length ?? 0) + (a.mergedHoldingIds?.length ?? 0) > 0 && (
                    <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                      {a.addedHoldingIds?.length ? <span>{a.addedHoldingIds.length} added</span> : null}
                      {a.mergedHoldingIds?.length ? <span>{a.mergedHoldingIds.length} merged</span> : null}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <div
                key={ev.id}
                className={cn(
                  "relative flex shrink-0 flex-col gap-1.5 rounded-xl border px-3 py-2 min-w-[160px] max-w-[220px] border-emerald-400/15 bg-emerald-500/[0.04]",
                  i < events.length - 1 && "after:absolute after:-right-1.5 after:top-1/2 after:h-2 after:w-2 after:-translate-y-1/2 after:rounded-full after:border after:border-white/10 after:bg-white/[0.03]",
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Plus className="h-3 w-3 text-emerald-300" />
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {formatDate(ev.timestamp)}
                  </span>
                  <span className="ml-auto text-[9px] text-muted-foreground">
                    {daysAgo(ev.timestamp)}
                  </span>
                </div>
                <div className="text-[11px] leading-tight text-foreground line-clamp-2">
                  {ev.description}
                </div>
              </div>
            );
          })()
        ))}
      </div>
    </div>
  );
}

function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
