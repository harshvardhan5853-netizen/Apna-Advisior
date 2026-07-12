"use client";

/**
 * ExtractionContext — React context + useReducer for background extraction jobs.
 *
 * Manages a list of ExtractionJob items, persists them to localStorage,
 * and provides helpers to add / update / remove / retry jobs.
 *
 * Wrapped around the app tree inside providers.tsx.
 */

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { ExtractionJob } from "@/lib/extraction-types";
import { runExtraction, type ExtractionResult } from "@/lib/run-extraction";
import { playSuccess, playFailure } from "@/lib/notification-sound";
import { toast } from "sonner";

/* ─── File cache for retry (not serialised — in-memory only) ─── */
/* Map<jobId, File[]> so retry works within the same page session. */

const fileCache = new Map<string, File[]>();

/** Max age for completed/failed notifications (7 days). */
const MAX_JOB_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/* ─── State shape ─── */

interface ExtractionState {
  jobs: ExtractionJob[];
  /** Timestamp of last time the bell dropdown was opened. */
  lastReadAt: number;
}

/* ─── Actions ─── */

type ExtractionAction =
  | { type: "ADD_JOB"; job: ExtractionJob }
  | {
      type: "UPDATE_JOB";
      id: string;
      patch: Partial<ExtractionJob>;
    }
  | { type: "REMOVE_JOB"; id: string }
  | { type: "CLEAR_COMPLETED" }
  | { type: "MARK_READ" }
  | { type: "HYDRATE"; jobs: ExtractionJob[] };

function reducer(
  state: ExtractionState,
  action: ExtractionAction,
): ExtractionState {
  switch (action.type) {
    case "ADD_JOB":
      return { ...state, jobs: [action.job, ...state.jobs] };
    case "UPDATE_JOB":
      return {
        ...state,
        jobs: state.jobs.map((j) =>
          j.id === action.id ? { ...j, ...action.patch } : j,
        ),
      };
    case "REMOVE_JOB": {
      fileCache.delete(action.id);
      return {
        ...state,
        jobs: state.jobs.filter((j) => j.id !== action.id),
      };
    }
    case "CLEAR_COMPLETED":
      for (const j of state.jobs) {
        if (j.status === "completed" || j.status === "failed") {
          fileCache.delete(j.id);
        }
      }
      return {
        ...state,
        jobs: state.jobs.filter(
          (j) => j.status !== "completed" && j.status !== "failed",
        ),
      };
    case "MARK_READ":
      return { ...state, lastReadAt: Date.now() };
    case "HYDRATE": {
      const now = Date.now();
      const cleaned = action.jobs.filter((j) => {
        // Drop stale "in-flight" jobs — they can never resume after a reload.
        if (j.status === "extracting" || j.status === "queued") return false;
        // Auto-clean jobs older than MAX_JOB_AGE.
        if (j.completedAt && now - j.completedAt > MAX_JOB_AGE_MS) return false;
        return true;
      });
      return { ...state, jobs: cleaned };
    }
    default:
      return state;
  }
}

/* ─── Persistence keys ─── */

const STORAGE_KEY = "apna-advisor.extraction-jobs";

function persist(jobs: ExtractionJob[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  } catch {
    /* storage full — ignore */
  }
}

function load(): ExtractionJob[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/* ─── Context interface ─── */

interface ExtractionContextValue {
  jobs: ExtractionJob[];
  addJob: (
    id: string,
    fileName: string,
    portfolioName: string,
    files: File[],
    passwordMap?: Map<number, string>,
  ) => void;
  updateJob: (id: string, patch: Partial<ExtractionJob>) => void;
  removeJob: (id: string) => void;
  clearCompleted: () => void;
  retryJob: (jobId: string) => void;
  markAsRead: () => void;
  /** Count of jobs that are extracting or queued (for badge display) */
  activeCount: number;
  /** Count of completed/failed jobs newer than lastReadAt */
  unreadCount: number;
  /** Count of completed + failed jobs not yet dismissed */
  doneCount: number;
  /** true if any job is extracting right now */
  isExtracting: boolean;
  /** true if any completed job has holdings (needs attention) */
  hasCompleted: boolean;
  /** true if any job has failed */
  hasFailed: boolean;
}

const ExtractionContext = createContext<ExtractionContextValue | undefined>(
  undefined,
);

/* ─── Provider ─── */

export function ExtractionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { jobs: [], lastReadAt: 0 });

  // Hydrate from localStorage on mount
  useEffect(() => {
    dispatch({ type: "HYDRATE", jobs: load() });
  }, []);

  // Persist on every change
  useEffect(() => {
    persist(state.jobs);
  }, [state.jobs]);

  const addJob = useCallback(
    (
      id: string,
      fileName: string,
      portfolioName: string,
      files: File[],
      passwordMap?: Map<number, string>,
    ) => {
      // Cache files for potential retry
      fileCache.set(id, files);

      const job: ExtractionJob = {
        id,
        fileName,
        status: "queued",
        stage: "uploading",
        startedAt: Date.now(),
        holdings: [],
        source: "generic",
        portfolioName,
        holdingsCount: 0,
      };

      dispatch({ type: "ADD_JOB", job });

      // Kick off extraction asynchronously
      void executeJob(id, files, portfolioName, passwordMap, dispatch);
    },
    [],
  );

  const updateJob = useCallback(
    (id: string, patch: Partial<ExtractionJob>) => {
      dispatch({ type: "UPDATE_JOB", id, patch });
    },
    [],
  );

  const removeJob = useCallback((id: string) => {
    dispatch({ type: "REMOVE_JOB", id });
  }, []);

  const clearCompleted = useCallback(() => {
    dispatch({ type: "CLEAR_COMPLETED" });
  }, []);

  const markAsRead = useCallback(() => {
    dispatch({ type: "MARK_READ" });
  }, []);

  const retryJob = useCallback(
    (jobId: string) => {
      const files = fileCache.get(jobId);
      if (!files || files.length === 0) {
        toast.error("Cannot retry — original files are no longer available. Please upload again.");
        return;
      }

      const job = state.jobs.find((j) => j.id === jobId);
      if (!job) return;

      dispatch({
        type: "UPDATE_JOB",
        id: jobId,
        patch: {
          status: "queued",
          stage: "Retrying…",
          startedAt: Date.now(),
          completedAt: undefined,
          error: undefined,
          holdings: [],
          holdingsCount: 0,
        },
      });
      void executeJob(jobId, files, job.portfolioName, undefined, dispatch);
    },
    [state.jobs],
  );

  const activeCount = state.jobs.filter(
    (j) => j.status === "queued" || j.status === "extracting",
  ).length;

  const doneCount = state.jobs.filter(
    (j) => j.status === "completed" || j.status === "failed",
  ).length;

  const isExtracting = state.jobs.some(
    (j) => j.status === "extracting" || j.status === "queued",
  );

  const hasCompleted = state.jobs.some(
    (j) => j.status === "completed" && j.holdingsCount > 0,
  );

  const hasFailed = state.jobs.some((j) => j.status === "failed");

  const unreadCount = state.jobs.filter(
    (j) =>
      (j.status === "completed" || j.status === "failed") &&
      j.completedAt != null &&
      j.completedAt > state.lastReadAt,
  ).length;

  return (
    <ExtractionContext.Provider
      value={{
        jobs: state.jobs,
        addJob,
        updateJob,
        removeJob,
        clearCompleted,
        retryJob,
        markAsRead,
        activeCount,
        unreadCount,
        doneCount,
        isExtracting,
        hasCompleted,
        hasFailed,
      }}
    >
      {children}
    </ExtractionContext.Provider>
  );
}

/* ─── Hook ─── */

export function useExtractions(): ExtractionContextValue {
  const ctx = useContext(ExtractionContext);
  if (!ctx)
    throw new Error("useExtractions must be used inside <ExtractionProvider>");
  return ctx;
}

/* ─── Background execution ─── */

async function executeJob(
  id: string,
  files: File[],
  portfolioName: string,
  passwordMap: Map<number, string> | undefined,
  dispatch: React.Dispatch<ExtractionAction>,
): Promise<void> {
  const update = (patch: Partial<ExtractionJob>) =>
    dispatch({ type: "UPDATE_JOB", id, patch });

  try {
    update({ status: "extracting", stage: "Uploading file" });

    const result: ExtractionResult = await runExtraction(files, (p) => {
      // Map progress labels to spec stage keys
      const stage = mapStage(p.label);
      update({ stage });
    }, passwordMap);

    const { holdings, source, validationResults, autoImportable: _autoImportable } = result;

    if (holdings.length > 0) {
      update({
        status: "completed",
        stage: "finished",
        completedAt: Date.now(),
        holdings,
        validationResults,
        source,
        portfolioName,
        holdingsCount: holdings.length,
      });

      playSuccess();
      toast.success(
        `Extracted ${holdings.length} holding${holdings.length > 1 ? "s" : ""} — review pending.`,
        {
          action: {
            label: "Review Portfolio",
            onClick: () => { window.location.href = `/portfolio/review?job=${id}`; },
          },
          duration: 6000,
        },
      );
    } else {
      update({
        status: "completed",
        stage: "finished",
        completedAt: Date.now(),
        holdings: [],
        source,
        portfolioName,
        holdingsCount: 0,
      });

      playFailure();
      toast.error(
        "Couldn't extract any holdings. Try a clearer file or different format.",
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Extraction failed";
    update({
      status: "failed",
      stage: "finished",
      completedAt: Date.now(),
      error: msg,
    });

    playFailure();
    toast.error(`Portfolio extraction failed: ${msg}`, {
      action: {
        label: "Retry",
        onClick: () => {
          // Re-import and re-execute
          const files = fileCache.get(id);
          if (files && files.length > 0) {
            dispatch({
              type: "UPDATE_JOB",
              id,
              patch: {
                status: "queued",
                stage: "Retrying…",
                startedAt: Date.now(),
                completedAt: undefined,
                error: undefined,
                holdings: [],
                holdingsCount: 0,
              },
            });
            void executeJob(id, files, portfolioName, undefined, dispatch);
          } else {
            toast.error("Original files no longer available. Please upload again.");
          }
        },
      },
      duration: 8000,
    });
  }
}

/**
 * Map fuzzy progress labels to the spec-defined stage keys so the
 * notification dropdown shows clean stage names.
 */
function mapStage(label: string): string {
  const lower = label.toLowerCase();
  if (lower.includes("upload") || lower.includes("read")) return "uploading";
  if (lower.includes("extract") || lower.includes("ocr")) return "ocr";
  if (lower.includes("pars")) return "parsing";
  if (lower.includes("valid")) return "validation";
  if (lower.includes("ai") || lower.includes("clean") || lower.includes("enhance")) return "ai_cleanup";
  if (lower.includes("merg") || lower.includes("duplic")) return "parsing";
  if (lower.includes("confid")) return "validation";
  if (lower.includes("finish") || lower.includes("creat")) return "finished";
  return "parsing";
}
