/**
 * Client-side password protection detection for uploaded documents.
 *
 * PDF  → Try pdfjs-dist `getDocument()` — catches PasswordException.
 * XLSX → Client-side SheetJS probe, falls back to server check.
 * Others → Can't be password-protected (images, CSV).
 */

import { isPdfFile, isExcelFile } from "../utils";

/**
 * Richer classification beyond boolean:
 *  ok          — file opened without issue
 *  protected   — file is password-protected
 *  corrupted   — file appears to be damaged / unreadable
 *  unsupported — file format cannot be handled
 */
export type FileProtectionStatus = "ok" | "protected" | "corrupted" | "unsupported";

export interface ProtectedFile {
  file: File;
  index: number;
  /** True only when the file is password-protected (kept for backward compat). */
  protected: boolean;
  /** Detailed classification. */
  status: FileProtectionStatus;
  /** User-facing message when status is not ok. */
  error?: string;
}

export interface DetectionProgress {
  fileName: string;
  index: number;
  total: number;
  phase: "checking" | "done" | "error";
}

/** Map status to a user-facing message. */
export function protectionStatusMessage(status: FileProtectionStatus, fileName: string): string | undefined {
  switch (status) {
    case "protected":
      return `"${fileName}" is password protected. Please enter the password to unlock it.`;
    case "corrupted":
      return `"${fileName}" appears to be damaged or incomplete. Try re-downloading from your broker and uploading again.`;
    case "unsupported":
      return `"${fileName}" couldn't be read. Try a PDF or screenshot instead.`;
    default:
      return undefined;
  }
}

/** Helper: fetch with a timeout. */
async function fetchWithTimeout(input: RequestInfo, init: RequestInit, timeoutMs = 15_000): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Check an array of uploaded files and return which ones are
 * password-protected. Skips non-applicable file types.
 */
export async function detectProtectedFiles(
  files: File[],
  onProgress?: (p: DetectionProgress) => void,
): Promise<ProtectedFile[]> {
  const results: ProtectedFile[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    if (isPdfFile(file)) {
      onProgress?.({ fileName: file.name, index: i, total: files.length, phase: "checking" });
      const status = await checkPdfProtected(file);
      results.push({
        file, index: i,
        protected: status === "protected",
        status,
        error: protectionStatusMessage(status, file.name),
      });
      onProgress?.({ fileName: file.name, index: i, total: files.length, phase: "done" });
    } else if (isExcelFile(file)) {
      onProgress?.({ fileName: file.name, index: i, total: files.length, phase: "checking" });
      const status = await checkExcelProtected(file);
      results.push({
        file, index: i,
        protected: status === "protected",
        status,
        error: protectionStatusMessage(status, file.name),
      });
      onProgress?.({ fileName: file.name, index: i, total: files.length, phase: "done" });
    } else {
      // Images, CSV — never password-protected
      results.push({ file, index: i, protected: false, status: "ok" });
    }
  }

  return results;
}

/**
 * Check a PDF file using pdfjs-dist.
 * Returns:
 *   "protected"  if pdfjs throws PasswordException
 *   "corrupted"  if pdfjs throws any other error
 *   "ok"         if the document opens without a password
 */
async function checkPdfProtected(file: File): Promise<FileProtectionStatus> {
  try {
    const pdfjs = await import("pdfjs-dist");
    const buf = await file.arrayBuffer();
    await pdfjs.getDocument({ data: buf }).promise;
    return "ok";
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      (err.name === "PasswordException" || (err as unknown as { name: string }).name === "PasswordException")
    ) {
      return "protected";
    }
    return "corrupted";
  }
}

/**
 * Check an Excel file. Tries client-side SheetJS first; if it fails,
 * sends a small probe to the server for authoritative classification.
 */
async function checkExcelProtected(file: File): Promise<FileProtectionStatus> {
  const buf = await file.arrayBuffer();
  try {
    const XLSX = await import("xlsx");
    XLSX.read(buf, { type: "array" });
    return "ok";
  } catch {
    // Server probe — distinguish protected / corrupted / unsupported.
    // NOTE: full buffer is required here because XLSX is a ZIP archive and
    // the ZIP central directory (with entry names like EncryptedPackage)
    // lives at the END of the file. Truncating to 8192 would make
    // check_protection() fail with BadZipFile → false "corrupted".
    try {
      const form = new FormData();
      form.append("file", new Blob([buf], { type: file.type }), file.name);
      form.append("kind", "xlsx");
      form.append("checkProtection", "1");
      const res = await fetchWithTimeout("/api/extract", { method: "POST", body: form });
      if (res.ok) {
        const data = (await res.json()) as {
          passwordProtected?: boolean;
          corrupted?: boolean;
          unsupported?: boolean;
          detail?: string;
        };
        if (data.corrupted) return "corrupted";
        if (data.unsupported) return "unsupported";
        if (data.passwordProtected) return "protected";
      }
      return "corrupted";
    } catch {
      return "corrupted";
    }
  }
}

export async function validatePassword(
  file: File,
  password: string,
): Promise<boolean> {
  if (isPdfFile(file)) {
    return validatePdfPassword(file, password);
  }
  if (isExcelFile(file)) {
    return validateExcelPassword(file, password);
  }
  return false;
}

async function validatePdfPassword(file: File, password: string): Promise<boolean> {
  try {
    const pdfjs = await import("pdfjs-dist");
    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buf, password }).promise;
    // Note: pdfjs-dist 6.x types omit destroy() — use the common
    // workaround to clean up the document reference.
    (doc as unknown as { destroy: () => void }).destroy();
    return true;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "PasswordException") {
      return false;
    }
    return false;
  }
}

async function validateExcelPassword(file: File, password: string): Promise<boolean> {
  try {
    const buf = await file.arrayBuffer();
    const form = new FormData();
    form.append("file", new Blob([buf], { type: file.type }), file.name);
    form.append("kind", "xlsx");
    form.append("password", password);
    form.append("checkPassword", "1");
    const res = await fetchWithTimeout("/api/extract", { method: "POST", body: form }, 20_000);
    if (res.ok) {
      const data = (await res.json()) as { passwordOk?: boolean };
      return data.passwordOk === true;
    }
    return false;
  } catch {
    return false;
  }
}
