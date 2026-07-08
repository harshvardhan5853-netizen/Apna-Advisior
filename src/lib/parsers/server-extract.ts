/**
 * Server-side extraction: spawn Python extract_service.py, optional Gemini fallback.
 */

import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { constants } from "node:fs";
import type { BrokerSource, Holding } from "@/types/portfolio";
import { normalizeStockName, normalizeSymbol, uid } from "@/lib/utils";
import { extractHoldingsWithGemini } from "./gemini-extract";

export const EXTRACT_SCRIPT = "extract_service.py";

export interface ExtractApiHolding {
  id?: string;
  stockName?: string;
  symbol?: string;
  exchange?: string;
  quantity?: number;
  avgBuyPrice?: number;
  currentPrice?: number;
  investedAmount?: number;
  currentValue?: number;
  pnl?: number;
  pnlPercent?: number;
  confidence?: number;
  needsReview?: boolean;
  source?: string;
}

export interface PythonExtractResult {
  source?: string;
  layout?: string;
  engine?: string;
  warnings?: string[];
  holdings?: ExtractApiHolding[];
  rawText?: string;
  error?: string;
  detail?: string;
}

export interface RunServerExtractOptions {
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
  kind: "image" | "pdf" | "xlsx";
  geminiApiKey?: string | null;
  geminiModel?: string;
  password?: string;
}

export interface ServerExtractResponse {
  source: BrokerSource;
  layout?: string;
  engine?: string;
  warnings: string[];
  holdings: Holding[];
  rawText?: string;
  geminiUsed?: boolean;
}

function resolvePythonExecutable(): string {
  const cwd = process.cwd();
  if (process.platform === "win32") {
    return path.join(cwd, ".venv", "Scripts", "python.exe");
  }
  return path.join(cwd, ".venv", "bin", "python");
}

export function resolveExtractScriptPath(): string {
  return path.join(process.cwd(), "scripts", EXTRACT_SCRIPT);
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function getExtractServiceStatus(): Promise<{
  ok: boolean;
  pythonPath: string;
  scriptPath: string;
  hasPython: boolean;
  hasScript: boolean;
}> {
  const pythonPath = resolvePythonExecutable();
  const scriptPath = resolveExtractScriptPath();
  const [hasPython, hasScript] = await Promise.all([pathExists(pythonPath), pathExists(scriptPath)]);
  return { ok: hasPython && hasScript, pythonPath, scriptPath, hasPython, hasScript };
}

function extensionFromInput(mime: string, fileName: string, kind: "image" | "pdf" | "xlsx"): string {
  if (kind === "pdf") return ".pdf";
  if (kind === "xlsx") return ".xlsx";
  const m = mime.toLowerCase();
  if (m.includes("png")) return ".png";
  if (m.includes("jpeg") || m.includes("jpg")) return ".jpg";
  if (m.includes("webp")) return ".webp";
  if (m.includes("bmp")) return ".bmp";
  const idx = fileName.lastIndexOf(".");
  if (idx !== -1) {
    const ext = fileName.slice(idx).toLowerCase();
    if ([".png", ".jpg", ".jpeg", ".webp", ".bmp"].includes(ext)) return ext;
  }
  return ".png";
}

/** Hard timeout for extraction child processes. */
export const EXTRACTION_TIMEOUT_MS = 60_000;

function runPython(
  pythonPath: string,
  scriptPath: string,
  filePath: string,
  kind: string,
  extraArgs: string[] = [],
  stdinInput?: string,
  signal?: AbortSignal,
): Promise<{
  stdout: string;
  stderr: string;
  code: number | null;
}> {
  return new Promise((resolve, reject) => {
    const args = [scriptPath, filePath, "--kind", kind, ...extraArgs];
    const spawnOptions: Parameters<typeof spawn>[2] = {
      cwd: process.cwd(),
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    };
    if (stdinInput !== undefined) {
      spawnOptions.stdio = ["pipe", "pipe", "pipe"];
    }
    const child = spawn(pythonPath, args, spawnOptions);
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let settled = false;

    function abortHandler() {
      if (settled) return;
      settled = true;
      child.kill();
      const err = new Error(signal?.aborted ? (signal.reason as string) || "Extraction cancelled" : "Extraction cancelled");
      (err as NodeJS.ErrnoException).code = signal?.aborted && signal.reason === "timeout" ? "extraction-timeout" : "extraction-aborted";
      reject(err);
    }

    signal?.addEventListener("abort", abortHandler, { once: true });

    child.stdout?.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr?.on("data", (chunk: Buffer) => stderrChunks.push(chunk));
    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", abortHandler);
      reject(err);
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", abortHandler);
      resolve({
        stdout: Buffer.concat(stdoutChunks).toString("utf-8"),
        stderr: Buffer.concat(stderrChunks).toString("utf-8"),
        code,
      });
    });
    if (stdinInput !== undefined && child.stdin) {
      child.stdin.write(stdinInput, "utf-8");
      child.stdin.end();
    }
  });
}

/**
 * Helper to determine file extension for check/validation probes.
 * Covers PDF, XLSX, and common image formats.
 */
function probeExtension(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  if (idx !== -1) {
    const ext = fileName.slice(idx).toLowerCase();
    if ([".pdf", ".xlsx", ".xls", ".xlsm", ".csv", ".png", ".jpg", ".jpeg", ".webp"].includes(ext)) return ext;
  }
  return ".bin";
}

export type CheckProtectionOptions =
  | { checkProtection: true; checkPassword?: never; password?: never }
  | { checkProtection?: never; checkPassword: true; password: string };

/**
 * Run the Python extraction script in check/validation mode.
 * Used to probe whether a file is password-protected or validate a password.
 */
export async function runPythonCheck(
  bytes: Uint8Array,
  fileName: string,
  _mimeType: string,
  options: CheckProtectionOptions,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const status = await getExtractServiceStatus();
  if (!status.hasPython) return { error: "python-unavailable" };
  if (!status.hasScript) return { error: "script-missing" };

  const ext = probeExtension(fileName);
  let workDir: string | null = null;

  try {
    workDir = await mkdtemp(path.join(tmpdir(), "apna-check-"));
    const filePath = path.join(workDir, `check${ext}`);
    await writeFile(filePath, bytes);

    const extraArgs: string[] = [];
    if (options.checkProtection) {
      extraArgs.push("--check-protection");
    }

    const stdinPassword = options.checkPassword ? options.password : undefined;
    if (options.checkPassword) {
      extraArgs.push("--password-stdin");
    }

    // Pass signal so child can be killed on abort/timeout
    const result = await runPython(
      status.pythonPath, status.scriptPath, filePath, "auto",
      extraArgs, stdinPassword, signal,
    );

    if (result.code !== 0) {
      return { error: result.stderr.trim() || result.stdout.trim() || `Python exited ${result.code}` };
    }

    try {
      return JSON.parse(result.stdout) as Record<string, unknown>;
    } catch {
      return { error: "invalid-json", raw: result.stdout.slice(0, 1000) };
    }
  } finally {
    if (workDir) {
      rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

function normalizeBrokerSource(s: unknown): BrokerSource {
  const t = String(s ?? "").toLowerCase();
  if (t === "groww" || t === "zerodha" || t === "angelone" || t === "upstox" || t === "dhan" || t === "manual") {
    return t;
  }
  return "generic";
}

function numberOrZero(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function mapPythonHoldings(raw: ExtractApiHolding[], defaultSource: BrokerSource): Holding[] {
  return raw.map((row) => {
    const source = normalizeBrokerSource(row.source ?? defaultSource);
    const stockName = normalizeStockName(String(row.stockName ?? ""));
    const symbolBase = row.symbol ? String(row.symbol) : stockName.split(/\s+/)[0] ?? "";
    const ex = String(row.exchange ?? "UNKNOWN").toUpperCase();
    return {
      id: String(row.id ?? uid("h")),
      stockName,
      symbol: normalizeSymbol(symbolBase),
      exchange: ex === "NSE" || ex === "BSE" ? ex : "UNKNOWN",
      quantity: numberOrZero(row.quantity),
      avgBuyPrice: numberOrZero(row.avgBuyPrice),
      currentPrice: numberOrZero(row.currentPrice),
      investedAmount: numberOrZero(row.investedAmount),
      currentValue: numberOrZero(row.currentValue),
      pnl: numberOrZero(row.pnl),
      pnlPercent: numberOrZero(row.pnlPercent),
      confidence: clamp01(numberOrZero(row.confidence)),
      needsReview: Boolean(row.needsReview),
      source,
    };
  });
}

export async function runServerExtract(
  options: RunServerExtractOptions,
  signal?: AbortSignal,
): Promise<ServerExtractResponse> {
  const status = await getExtractServiceStatus();
  if (!status.hasPython) {
    throw Object.assign(new Error("python-unavailable"), {
      code: "python-unavailable",
      detail: `Python venv not found at ${status.pythonPath}. Run: py -m venv .venv && .venv\\Scripts\\pip install -r requirements.txt`,
    });
  }
  if (!status.hasScript) {
    throw Object.assign(new Error("script-missing"), {
      code: "script-missing",
      detail: `scripts/${EXTRACT_SCRIPT} not found`,
    });
  }

  const ext = extensionFromInput(options.mimeType, options.fileName, options.kind);
  let workDir: string | null = null;

  try {
    workDir = await mkdtemp(path.join(tmpdir(), "apna-extract-"));
    const filePath = path.join(workDir, `upload${ext}`);
    await writeFile(filePath, options.bytes);

    const extraArgs: string[] = [];
    const stdinInput: string | undefined = options.password;
    if (options.password) {
      extraArgs.push("--extract-with-password");
    }

    // When password is provided the Python script uses --extract-with-password
    // which auto-detects kind from extension, so pass "auto" for --kind.
    const pyKind = options.password ? "auto" : options.kind;

    const result = await runPython(
      status.pythonPath, status.scriptPath, filePath, pyKind,
      extraArgs, stdinInput, signal,
    );

    if (result.code !== 0) {
      throw Object.assign(new Error("extract-failed"), {
        code: "extract-failed",
        detail: result.stderr.trim() || result.stdout.trim() || `Python exited ${result.code}`,
      });
    }

    let payload: PythonExtractResult;
    try {
      payload = JSON.parse(result.stdout) as PythonExtractResult;
    } catch (err) {
      throw Object.assign(new Error("invalid-json"), {
        code: "invalid-json",
        detail: err instanceof Error ? err.message : String(err),
        raw: result.stdout.slice(0, 2000),
      });
    }

    if (payload.error && (!payload.holdings || payload.holdings.length === 0)) {
      throw Object.assign(new Error(payload.error), {
        code: payload.error,
        detail: payload.detail ?? payload.error,
      });
    }

    const source = normalizeBrokerSource(payload.source);
    const warnings = Array.isArray(payload.warnings)
      ? payload.warnings.filter((w): w is string => typeof w === "string")
      : [];
    let holdings = mapPythonHoldings(Array.isArray(payload.holdings) ? payload.holdings : [], source);
    let geminiUsed = false;

    const apiKey = options.geminiApiKey?.trim() ?? "";
    const rawText = payload.rawText ?? "";
    const needsGemini =
      apiKey.length >= 20 &&
      rawText.length > 40 &&
      (holdings.length === 0 || holdings.every((h) => h.confidence < 0.55));

    if (needsGemini) {
      try {
        const gemini = await extractHoldingsWithGemini(rawText, apiKey, options.geminiModel);
        if (gemini.holdings.length > 0) {
          holdings = gemini.holdings;
          geminiUsed = true;
          warnings.push(...gemini.warnings);
        }
      } catch (err) {
        warnings.push(
          `Gemini extraction failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    } else if (holdings.length === 0 && rawText.length > 40 && apiKey.length < 20) {
      warnings.push(
        "Add a Gemini API key in News settings for AI-assisted extraction when OCR/PDF parsing finds no rows.",
      );
    }

    return {
      source: geminiUsed ? normalizeBrokerSource(holdings[0]?.source ?? source) : source,
      layout: payload.layout,
      engine: geminiUsed ? "gemini" : payload.engine,
      warnings,
      holdings,
      rawText,
      geminiUsed,
    };
  } finally {
    if (workDir) {
      rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
