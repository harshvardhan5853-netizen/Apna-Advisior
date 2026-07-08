import { NextResponse } from "next/server";
import { getExtractServiceStatus, runServerExtract } from "@/lib/parsers/server-extract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_BYTES = 25 * 1024 * 1024;

function isPdfName(name: string, mime: string): boolean {
  return mime.includes("pdf") || name.toLowerCase().endsWith(".pdf");
}

function isImageName(name: string, mime: string): boolean {
  if (mime.startsWith("image/")) return true;
  return /\.(png|jpe?g|webp|bmp)$/i.test(name);
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
    return NextResponse.json({ error: "file-too-large", detail: "File exceeds 25MB limit" }, { status: 413 });
  }

  const kindField = String(formData.get("kind") ?? "auto");
  const mime = file.type || "";
  const name = file.name || "upload";
  let kind: "image" | "pdf";
  if (kindField === "pdf" || isPdfName(name, mime)) {
    kind = "pdf";
  } else if (kindField === "image" || isImageName(name, mime)) {
    kind = "image";
  } else {
    return NextResponse.json(
      { error: "unsupported-type", detail: `Unsupported file type: ${name} (${mime || "unknown"})` },
      { status: 400 },
    );
  }

  const geminiApiKey = formData.get("geminiApiKey");
  const geminiModel = formData.get("geminiModel");

  const bytes = new Uint8Array(await file.arrayBuffer());

  try {
    const result = await runServerExtract({
      bytes,
      fileName: name,
      mimeType: mime,
      kind,
      geminiApiKey: typeof geminiApiKey === "string" ? geminiApiKey : null,
      geminiModel: typeof geminiModel === "string" ? geminiModel : undefined,
    });

    return NextResponse.json({
      source: result.source,
      layout: result.layout,
      engine: result.engine,
      warnings: result.warnings,
      holdings: result.holdings,
      geminiUsed: result.geminiUsed ?? false,
    });
  } catch (err) {
    const e = err as Error & { code?: string; detail?: string; raw?: string };
    const code = e.code ?? "server-error";
    const status =
      code === "python-unavailable" || code === "script-missing" ? 503 : code === "invalid-json" ? 500 : 500;
    return NextResponse.json(
      { error: code, detail: e.detail ?? e.message, raw: e.raw },
      { status },
    );
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
