import { NextResponse } from "next/server";
import { z } from "zod";
import { getExtractServiceStatus, runServerExtract, runPythonCheck, EXTRACTION_TIMEOUT_MS } from "@/lib/parsers/server-extract";
import { extractSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

const MAX_BYTES = 50 * 1024 * 1024;

const ALLOWED_EXTENSIONS = /\.(csv|xlsx?|pdf|png|jpe?g|webp|bmp)$/i;

const USER_FRIENDLY_ERRORS: Record<string, string> = {
  "python-unavailable": "Extraction service unavailable. Please ensure Python is installed and the virtual environment is set up.",
  "script-missing": "Extraction script not found. Please reinstall the application.",
  "extraction-timeout": "Extraction timed out. The file may be too large or complex. Try a smaller or clearer file.",
  "extraction-aborted": "Extraction was cancelled.",
  "extract-failed": "Could not extract holdings from the file. The format may be unsupported or the file may be corrupted.",
  "invalid-json": "Extraction produced unexpected output. This may indicate a corrupted file.",
  "invalid-multipart": "Invalid upload data. Please try again.",
  "missing-file": "No file provided. Please select a file to upload.",
  "empty-file": "The uploaded file is empty. Please select a file with data.",
  "file-too-large": "File exceeds the 50MB limit. Please upload a smaller file.",
  "unsupported-type": "This file type is not supported. Please upload a CSV, Excel, PDF, or image file.",
  "server-error": "Something went wrong on our end. Please try again.",
};

function isPdfName(name: string, mime: string): boolean {
  return mime.includes("pdf") || name.toLowerCase().endsWith(".pdf");
}

function isImageName(name: string, mime: string): boolean {
  if (mime.startsWith("image/")) return true;
  return /\.(png|jpe?g|webp|bmp)$/i.test(name);
}

function isExcelName(name: string, mime: string): boolean {
  if (
    mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mime === "application/vnd.ms-excel"
  ) return true;
  return /\.xlsx?$/i.test(name);
}

export async function POST(req: Request) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (err) {
    return NextResponse.json(
      { error: "invalid-multipart", detail: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }

  const file = (formData.get("file") ?? formData.get("image")) as FormDataEntryValue | null;
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "missing-file", detail: "Expected 'file' (or legacy 'image') field" },
      { status: 400 },
    );
  }
  if (file.size <= 0) {
    return NextResponse.json({ error: "empty-file", detail: "Uploaded file is empty" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file-too-large", detail: "File exceeds 50MB limit" }, { status: 413 });
  }

  // File extension whitelist
  const fileNameExt = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
  if (fileNameExt && !ALLOWED_EXTENSIONS.test(fileNameExt)) {
    return NextResponse.json(
      { error: "unsupported-type", detail: `File type "${fileNameExt}" is not supported. Accepted: CSV, XLSX, PDF, PNG, JPG, WEBP, BMP.` },
      { status: 400 },
    );
  }

  // Create cancellation signal: browser disconnect + hard timeout
  const abortController = new AbortController();
  const onBrowserAbort = () => abortController.abort("browser-disconnected");
  req.signal.addEventListener("abort", onBrowserAbort, { once: true });
  const timeoutId = setTimeout(() => abortController.abort("timeout"), EXTRACTION_TIMEOUT_MS);
  const signal = abortController.signal;

  function cleanup() {
    clearTimeout(timeoutId);
    req.signal.removeEventListener("abort", onBrowserAbort);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const name = file.name || "upload";
  const mime = file.type || "";

  try {
    // Protection check mode (probe if file is password-protected)
    const checkProtection = formData.get("checkProtection") === "1";
    if (checkProtection) {
      try {
        const result = await runPythonCheck(bytes, name, mime, { checkProtection: true }, signal);
        cleanup();
        return NextResponse.json(result);
      } catch (err) {
        cleanup();
        return NextResponse.json({ passwordProtected: false, error: String(err) }, { status: 500 });
      }
    }

    // Password validation mode (verify a supplied password)
    const checkPassword = formData.get("checkPassword") === "1";
    if (checkPassword) {
      const password = String(formData.get("password") ?? "");
      if (!password) {
        cleanup();
        return NextResponse.json({ passwordOk: false, error: "No password provided" }, { status: 400 });
      }
      try {
        const result = await runPythonCheck(bytes, name, mime, { checkPassword: true, password }, signal);
        cleanup();
        return NextResponse.json(result);
      } catch (err) {
        cleanup();
        return NextResponse.json({ passwordOk: false, error: String(err) }, { status: 500 });
      }
    }

    // Normal extraction mode
    const fieldsParsed = extractSchema.safeParse(Object.fromEntries(formData));
    if (!fieldsParsed.success) {
      cleanup();
      return NextResponse.json(
        { error: "invalid-multipart", detail: fieldsParsed.error.issues.map((e) => e.message).join("; ") },
        { status: 400 },
      );
    }
    const kindField = fieldsParsed.data.kind ?? "auto";
    let kind: "image" | "pdf" | "xlsx";
    if (kindField === "xlsx" || isExcelName(name, mime)) {
      kind = "xlsx";
    } else if (kindField === "pdf" || isPdfName(name, mime)) {
      kind = "pdf";
    } else if (kindField === "image" || isImageName(name, mime)) {
      kind = "image";
    } else {
      cleanup();
      return NextResponse.json(
        { error: "unsupported-type", detail: `Unsupported file type: ${name} (${mime || "unknown"})` },
        { status: 400 },
      );
    }

    const geminiApiKey = fieldsParsed.data.geminiApiKey;
    const geminiModel = fieldsParsed.data.geminiModel;
    const password = fieldsParsed.data.password ?? "";

    try {
      const result = await runServerExtract({
        bytes,
        fileName: name,
        mimeType: mime,
        kind,
        geminiApiKey: typeof geminiApiKey === "string" ? geminiApiKey : null,
        geminiModel: typeof geminiModel === "string" ? geminiModel : undefined,
        password: password || undefined,
      }, signal);

      cleanup();
      return NextResponse.json({
        source: result.source,
        layout: result.layout,
        engine: result.engine,
        warnings: result.warnings,
        holdings: result.holdings,
        geminiUsed: result.geminiUsed ?? false,
      });
    } catch (err) {
      cleanup();
      const e = err as Error & { code?: string; detail?: string; raw?: string };
      const code = e.code ?? "server-error";
      const status =
        code === "python-unavailable" || code === "script-missing" ? 503
        : code === "extraction-timeout" || code === "extraction-aborted" ? 504
        : code === "invalid-json" ? 500
        : 500;
      // User-friendly message — never expose stack traces or internal paths
      const friendly = USER_FRIENDLY_ERRORS[code] ?? USER_FRIENDLY_ERRORS["server-error"];
      return NextResponse.json(
        { error: code, detail: friendly },
        { status },
      );
    }
  } finally {
    cleanup();
  }
}

export async function GET() {
  const status = await getExtractServiceStatus();
  return NextResponse.json({
    ok: status.ok,
    pythonPath: status.pythonPath,
    scriptPath: status.scriptPath,
    hasPython: status.hasPython,
    hasScript: status.hasScript,
  });
}
