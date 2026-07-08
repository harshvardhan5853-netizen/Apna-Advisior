"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  ChevronDown,
  ClipboardPaste,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  ImageIcon,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const ACCEPT_STR =
  ".csv,.xls,.xlsx,.pdf,.png,.jpg,.jpeg,.webp";

interface UploadAreaProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  onOpenCamera?: () => void;
  processing?: boolean;
  processingLabel?: string;
  progress?: number; // 0..1
}

export function UploadArea({
  files,
  onFilesChange,
  onOpenCamera,
  processing,
  processingLabel,
  progress,
}: UploadAreaProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [showHints, setShowHints] = React.useState(false);

  const openFilePicker = React.useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
        onFilesChange([...files, ...Array.from(e.target.files)]);
        e.target.value = "";
      }
    },
    [files, onFilesChange],
  );

  // Paste screenshots via Ctrl+V. Scope: while dialog/section is mounted.
  React.useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      if (!e.clipboardData) return;
      const items = Array.from(e.clipboardData.items);
      const pasted: File[] = [];
      for (const item of items) {
        if (item.kind === "file") {
          const f = item.getAsFile();
          if (f) {
            // Give pasted images a friendlier name.
            const named =
              f.name && f.name !== "image.png"
                ? f
                : new File([f], `pasted-${Date.now()}.png`, { type: f.type });
            pasted.push(named);
          }
        }
      }
      if (pasted.length) {
        e.preventDefault();
        onFilesChange([...files, ...pasted]);
      }
    }
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [files, onFilesChange]);

  const removeAt = (idx: number) => {
    const next = files.slice();
    next.splice(idx, 1);
    onFilesChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        onClick={openFilePicker}
        className={cn(
          "group relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center transition-all",
          "hover:border-emerald-400/40 hover:bg-emerald-400/[0.04]",
          processing && "pointer-events-none opacity-70",
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_STR}
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        <AnimatePresence mode="wait">
          {processing ? (
            <motion.div
              key="proc"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="relative">
                <span className="absolute inset-0 rounded-full bg-emerald-400/30 animate-pulse-ring" />
                <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-300" />
                </div>
              </div>
              <div className="font-display text-base font-medium">
                {processingLabel ?? "Extracting holdings…"}
              </div>
              {typeof progress === "number" && (
                <div className="w-56">
                  <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-[width] duration-300"
                      style={{ width: `${Math.round(progress * 100)}%` }}
                    />
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {Math.round(progress * 100)}%
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="relative">
                <div
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-emerald-400/25 blur-2xl transition-opacity group-hover:opacity-80"
                />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-400/25 bg-gradient-to-br from-emerald-400/15 to-emerald-500/[0.02] animate-float">
                  <UploadCloud className="h-7 w-7 text-emerald-300" />
                </div>
              </div>
              <div className="max-w-xs">
                <div className="font-display text-base font-semibold text-foreground">
                  Paste Screenshot or Click to Upload
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  We&apos;ll auto-detect Groww, Zerodha, Angel One, Upstox &amp; Dhan.
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                <FormatPill icon={FileSpreadsheet}>CSV · XLSX</FormatPill>
                <FormatPill icon={FileText}>PDF</FormatPill>
                <FormatPill icon={ImageIcon}>PNG · JPG · WEBP</FormatPill>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2" data-nofocus>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    openFilePicker();
                  }}
                >
                  <UploadCloud className="h-4 w-4" /> Browse files
                </Button>
                <PasteHintButton />
                {onOpenCamera && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="hidden sm:inline-flex"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenCamera();
                      }}
                    >
                      <Camera className="h-4 w-4" /> Camera
                    </Button>
                    <label
                      className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-3 text-xs font-medium text-foreground transition-colors hover:bg-white/[0.06] sm:hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Camera className="h-4 w-4 text-muted-foreground" />
                      Camera
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.length) {
                            onFilesChange([...files, ...Array.from(e.target.files)]);
                          }
                        }}
                      />
                    </label>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {files.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <FileGlyph file={f} />
                <div className="min-w-0">
                  <div className="truncate font-medium">{f.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {(f.size / 1024).toFixed(1)} KB
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
                onClick={() => removeAt(i)}
                aria-label={`Remove ${f.name}`}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-3 text-xs">
        <button
          type="button"
          onClick={() => setShowHints(!showHints)}
          className="flex w-full items-center justify-between text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="flex items-center gap-1.5 font-medium">
            <HelpCircle className="h-3.5 w-3.5 text-emerald-300" />
            Broker-specific Import Guidelines
          </span>
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showHints && "rotate-180")} />
        </button>

        <AnimatePresence>
          {showHints && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3.5 grid grid-cols-1 gap-4 border-t border-white/[0.04] pt-3 md:grid-cols-2 text-[11px] text-muted-foreground/90">
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Groww</h4>
                  <p>• <b>Excel/CSV:</b> Download holdings Excel from Groww profile.</p>
                  <p>• <b>Screenshot:</b> Clear capture of the main Holdings list showing stock names, average prices, and current values.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Zerodha (Kite/Console)</h4>
                  <p>• <b>Excel/CSV:</b> Export Excel report from Console &gt; Holdings.</p>
                  <p>• <b>Screenshot:</b> Full capture of Kite Holdings web screen or mobile page.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Angel One</h4>
                  <p>• <b>PDF:</b> Upload transactional Ledger PDF report.</p>
                  <p>• <b>Screenshot:</b> Screenshot of the portfolio holdings dashboard.</p>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Upstox &amp; Dhan</h4>
                  <p>• <b>Files:</b> Upload holdings report PDF/Excel.</p>
                  <p>• <b>Screenshot:</b> Full view of portfolio value and stock lists.</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function FormatPill({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] px-2 py-0.5">
      <Icon className="h-3 w-3 text-emerald-300/80" />
      {children}
    </span>
  );
}

function PasteHintButton() {
  const [flash, setFlash] = React.useState(false);
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-3 text-xs font-medium text-foreground transition-colors hover:bg-white/[0.06]",
        flash && "border-emerald-400/50 bg-emerald-400/10 text-emerald-100",
      )}
      onClick={(e) => {
        e.stopPropagation();
        setFlash(true);
        setTimeout(() => setFlash(false), 900);
      }}
      title="Copy a screenshot then press Ctrl+V here"
    >
      <ClipboardPaste className="h-3.5 w-3.5" /> Paste (Ctrl+V)
    </button>
  );
}

function FileGlyph({ file }: { file: File }) {
  const isImage = /^image\//.test(file.type) || /\.(png|jpe?g|webp)$/i.test(file.name);
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  const isSheet =
    /excel|spreadsheet/i.test(file.type) || /\.(csv|xlsx?)$/i.test(file.name);
  const Icon = isImage ? ImageIcon : isPdf ? FileText : isSheet ? FileSpreadsheet : UploadCloud;
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-emerald-400/[0.08] text-emerald-300">
      <Icon className="h-4 w-4" />
    </div>
  );
}
