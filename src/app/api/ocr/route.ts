import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { constants } from "node:fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function resolvePythonExecutable(): string {
  const cwd = process.cwd();
  if (process.platform === "win32") {
    return path.join(cwd, ".venv", "Scripts", "python.exe");
  }
  return path.join(cwd, ".venv", "bin", "python");
}

function resolveScriptPath(): string {
  return path.join(process.cwd(), "scripts", "ocr_service.py");
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

interface PythonResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

function runPython(pythonPath: string, scriptPath: string, imagePath: string): Promise<PythonResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(pythonPath, [scriptPath, imagePath], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8",
      },
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutChunks.push(chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk);
    });
    child.on("error", (err) => {
      reject(err);
    });
    child.on("close", (code) => {
      resolve({
        stdout: Buffer.concat(stdoutChunks).toString("utf-8"),
        stderr: Buffer.concat(stderrChunks).toString("utf-8"),
        code,
      });
    });
  });
}

function extensionFromMime(mime: string, fallbackName: string): string {
  const m = mime.toLowerCase();
  if (m.includes("png")) return ".png";
  if (m.includes("jpeg") || m.includes("jpg")) return ".jpg";
  if (m.includes("webp")) return ".webp";
  if (m.includes("bmp")) return ".bmp";
  const idx = fallbackName.lastIndexOf(".");
  if (idx !== -1) {
    const ext = fallbackName.slice(idx).toLowerCase();
    if ([".png", ".jpg", ".jpeg", ".webp", ".bmp"].includes(ext)) return ext;
  }
  return ".png";
}

export async function POST(req: Request) {
  const pythonPath = resolvePythonExecutable();
  const scriptPath = resolveScriptPath();

  const [hasPython, hasScript] = await Promise.all([pathExists(pythonPath), pathExists(scriptPath)]);
  if (!hasPython) {
    return NextResponse.json(
      { error: "python-unavailable", detail: `Python venv not found at ${pythonPath}. Run: py -m venv .venv && .venv\\Scripts\\pip install -r requirements.txt` },
      { status: 503 },
    );
  }
  if (!hasScript) {
    return NextResponse.json(
      { error: "script-missing", detail: `scripts/ocr_service.py not found at ${scriptPath}` },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (err) {
    return NextResponse.json(
      { error: "invalid-multipart", detail: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }

  const file = formData.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing-image", detail: "Expected 'image' file field" }, { status: 400 });
  }
  if (file.size <= 0) {
    return NextResponse.json({ error: "empty-image", detail: "Uploaded file is empty" }, { status: 400 });
  }
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "image-too-large", detail: "Image exceeds 20MB limit" }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = extensionFromMime(file.type || "", file.name || "upload.png");

  let workDir: string | null = null;
  try {
    workDir = await mkdtemp(path.join(tmpdir(), "apna-ocr-"));
    const imagePath = path.join(workDir, `upload${ext}`);
    await writeFile(imagePath, bytes);

    const result = await runPython(pythonPath, scriptPath, imagePath);

    if (result.code !== 0) {
      return NextResponse.json(
        {
          error: "ocr-failed",
          detail: result.stderr.trim() || result.stdout.trim() || `Python exited with code ${result.code ?? "unknown"}`,
          code: result.code,
        },
        { status: 500 },
      );
    }

    let payload: unknown;
    try {
      payload = JSON.parse(result.stdout);
    } catch (err) {
      return NextResponse.json(
        {
          error: "invalid-json",
          detail: err instanceof Error ? err.message : String(err),
          raw: result.stdout.slice(0, 2000),
          stderr: result.stderr.slice(0, 2000),
        },
        { status: 500 },
      );
    }

    if (payload && typeof payload === "object" && "error" in payload) {
      return NextResponse.json(payload, { status: 500 });
    }

    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: "server-error", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  } finally {
    if (workDir) {
      rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

export async function GET() {
  const pythonPath = resolvePythonExecutable();
  const scriptPath = resolveScriptPath();
  const [hasPython, hasScript] = await Promise.all([pathExists(pythonPath), pathExists(scriptPath)]);
  return NextResponse.json({
    ok: hasPython && hasScript,
    pythonPath,
    scriptPath,
    hasPython,
    hasScript,
  });
}
