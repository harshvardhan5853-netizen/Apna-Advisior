"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  FileSpreadsheet,
  ImageIcon,
  KeyRound,
  Loader2,
  Lock,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// ─── Types ──────────────────────────────────────────────────────────────────

export type PasswordState = "idle" | "validating" | "error" | "success";

export interface PasswordPromptFile {
  name: string;
  index: number;
}

interface PasswordPromptDialogProps {
  protectedFiles: PasswordPromptFile[];
  currentIndex: number;
  state: PasswordState;
  errorMessage?: string;
  password: string;
  onPasswordChange: (val: string) => void;
  onSubmit: (password: string) => void;
  onCancel: () => void;
  totalProtected: number;
  useForAll?: boolean;
  onUseForAllChange?: (val: boolean) => void;
  embedded?: boolean;
}

// ─── Icon helpers ───────────────────────────────────────────────────────────

function fileIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return FileText;
  if (/\.xlsx?$/.test(lower)) return FileSpreadsheet;
  if (/\.(png|jpe?g|webp|bmp)$/.test(lower)) return ImageIcon;
  return FileText;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function PasswordPromptDialog({
  protectedFiles,
  currentIndex,
  state,
  errorMessage,
  password,
  onPasswordChange,
  onSubmit,
  onCancel,
  totalProtected,
  useForAll,
  onUseForAllChange,
  embedded,
}: PasswordPromptDialogProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = React.useState(false);

  // Auto-focus password input when dialog appears or retry happens
  React.useEffect(() => {
    if (state === "idle" || state === "error") {
      // Small delay so the DOM is ready
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [state, currentIndex]);

  const currentFile = protectedFiles[currentIndex];
  const Icon = currentFile ? fileIcon(currentFile.name) : Lock;
  const isSingleFile = totalProtected === 1;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "validating" || !password.trim()) return;
    onSubmit(password);
  };

  const formFields = (
    <>
      {/* ── Password input ── */}
      <div className="relative">
        <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/20" />
        <Input
          ref={inputRef}
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => {
            onPasswordChange(e.target.value);
          }}
          placeholder="Enter document password"
          disabled={state === "validating" || state === "success"}
          className={[
            "h-11 pl-10 pr-10 text-sm",
            state === "error" ? "border-red-500/50 focus-visible:border-red-500/50 focus-visible:ring-red-500/20" : "",
          ].join(" ")}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 transition-colors hover:text-white/50"
          tabIndex={-1}
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>

      {/* Error */}
      <AnimatePresence>
        {state === "error" && errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-start gap-2 rounded-lg border border-red-500/15 bg-red-500/[0.04] px-3 py-2">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-red-400" />
              <p className="text-xs text-red-300 leading-relaxed">{errorMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading */}
      <AnimatePresence>
        {state === "validating" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center gap-2.5 rounded-lg border border-emerald-400/15 bg-emerald-500/[0.04] px-3 py-2">
              <Loader2 className="size-3.5 animate-spin text-emerald-300" />
              <span className="text-xs text-emerald-200/80">Unlocking document&hellip;</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success */}
      <AnimatePresence>
        {state === "success" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center gap-2.5 rounded-lg border border-emerald-400/15 bg-emerald-500/[0.04] px-3 py-2">
              <CheckCircle2 className="size-3.5 text-emerald-300" />
              <span className="text-xs text-emerald-200/80">Document unlocked successfully. Starting extraction&hellip;</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Use-same-password checkbox — only for multi-file uploads */}
      {state === "idle" && totalProtected > 1 && (
        <label className="flex cursor-pointer items-center gap-2.5 select-none">
          <input
            type="checkbox"
            checked={useForAll ?? false}
            onChange={(e) => onUseForAllChange?.(e.target.checked)}
            className="size-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/30"
          />
          <span className="text-xs text-white/50 leading-relaxed">Use this password for all protected files in this upload</span>
        </label>
      )}

      {/* ── Footer ── */}
      <div className="flex items-center justify-end gap-2 pt-3.5">
        {state !== "validating" && state !== "success" && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
        {state !== "success" && (
          <Button
            type="submit"
            size="sm"
            disabled={!password.trim() || state === "validating"}
            className="min-w-[130px]"
          >
            {state === "validating" ? (
              <>
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                Unlocking&hellip;
              </>
            ) : (
              <>
                <KeyRound className="mr-1.5 size-3.5" />
                Unlock &amp; Extract
              </>
            )}
          </Button>
        )}
      </div>
    </>
  );

  const embeddedContent = (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {/* ── Header ── */}
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <span className="absolute inset-0 rounded-xl bg-emerald-400/20 blur-lg" />
            <div className="relative flex size-11 items-center justify-center rounded-xl border border-emerald-400/25 bg-gradient-to-br from-emerald-400/15 to-emerald-500/[0.04]">
              {state === "success" ? (
                <CheckCircle2 className="size-5 text-emerald-300" />
              ) : (
                <Lock className="size-5 text-emerald-300" />
              )}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-white/90">Password Protected Document</h2>
            <p className="mt-1 text-sm text-white/40 leading-relaxed">
              {isSingleFile
                ? `"${currentFile?.name ?? "Unknown file"}" is encrypted. Enter its password to unlock and extract holdings.`
                : `File ${currentIndex + 1} of ${totalProtected}: "${currentFile?.name ?? "Unknown file"}" is encrypted. Enter its password to unlock.`}
            </p>
          </div>
        </div>

        {/* ── File info pill ── */}
        <div className="inline-flex items-center gap-2 self-start rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-xs text-white/50">
          <Icon className="size-3.5 text-emerald-300/70" />
          <span className="font-medium truncate max-w-[200px]">
            {currentFile?.name ?? "Unknown"}
          </span>
        </div>

        {formFields}
      </form>
    </div>
  );

  const standaloneCard = (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: 12 }}
      transition={{ type: "spring", damping: 28, stiffness: 340 }}
      className="relative w-full max-w-md"
    >
      <form
        onSubmit={handleSubmit}
        className={[
          "relative overflow-hidden rounded-2xl border shadow-2xl",
          "border-white/[0.08] bg-[#0a0a0f]/95 backdrop-blur-xl",
          "before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
        ].join(" ")}
      >
        {/* Top gradient accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />

        {/* ── Header ── */}
        <div className="relative flex items-start gap-4 px-6 pt-6 pb-4">
          <div className="relative shrink-0">
            <span className="absolute inset-0 rounded-xl bg-emerald-400/20 blur-lg" />
            <div className="relative flex size-11 items-center justify-center rounded-xl border border-emerald-400/25 bg-gradient-to-br from-emerald-400/15 to-emerald-500/[0.04]">
              {state === "success" ? (
                <CheckCircle2 className="size-5 text-emerald-300" />
              ) : (
                <Lock className="size-5 text-emerald-300" />
              )}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-white/90">Password Protected Document</h2>
            <p className="mt-1 text-sm text-white/40 leading-relaxed">
              {isSingleFile
                ? `"${currentFile?.name ?? "Unknown file"}" is encrypted. Enter its password to unlock and extract holdings.`
                : `File ${currentIndex + 1} of ${totalProtected}: "${currentFile?.name ?? "Unknown file"}" is encrypted. Enter its password to unlock.`}
            </p>
          </div>
          {state !== "validating" && (
            <button
              type="button"
              onClick={onCancel}
              className="shrink-0 rounded-lg p-1.5 text-white/30 transition-colors hover:bg-white/[0.06] hover:text-white/60"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* ── File info pill ── */}
        <div className="mx-6 mb-3">
          <div className="inline-flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-xs text-white/50">
            <Icon className="size-3.5 text-emerald-300/70" />
            <span className="font-medium truncate max-w-[200px]">
              {currentFile?.name ?? "Unknown"}
            </span>
          </div>
        </div>

        <div className="px-6 pb-4">
          {formFields}
        </div>
      </form>
    </motion.div>
  );

  if (embedded) return embeddedContent;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={state === "validating" ? undefined : onCancel}
      />
      {standaloneCard}
    </div>
  );
}
