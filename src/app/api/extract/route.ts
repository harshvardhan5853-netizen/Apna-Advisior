import { NextResponse } from "next/server";
import { getExtractServiceStatus, runServerExtract, runPythonCheck, EXTRACTION_TIMEOUT_MS } from "@/lib/parsers/server-extract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_BYTES = 50 * 1024 * 1024;

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
    const kindField = String(formData.get("kind") ?? "auto");
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

    const geminiApiKey = formData.get("geminiApiKey");
    const geminiModel = formData.get("geminiModel");
    const password = String(formData.get("password") ?? "");

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
      return NextResponse.json(
        { error: code, detail: e.detail ?? e.message, raw: e.raw },
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
