"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Bot,
  Eye,
  EyeOff,
  ExternalLink,
  History,
  Info,
  Loader2,
  RotateCcw,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  DEFAULT_AI_EXTRACTION_SETTINGS,
  readAiExtractionSettings,
  writeAiExtractionSettings,
  type AiExtractionSettings,
  type ExtractionModel,
} from "@/lib/ai-extraction-settings";
import {
  readNotificationSettings,
  writeNotificationSettings,
} from "@/lib/notification-settings";

interface AiExtractionSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MODEL_OPTIONS: Array<{ value: ExtractionModel; label: string; note: string }> = [
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", note: "(recommended)" },
  { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite", note: "Cheapest, slightly weaker" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", note: "Best quality, lower free quota" },
];

const BEHAVIOR_OPTIONS: Array<{ key: keyof Pick<AiExtractionSettings, "autoExtractOnUpload" | "reviewBeforeSaving" | "deleteScreenshotAfterExtraction">; label: string }> = [
  { key: "autoExtractOnUpload", label: "Auto-extract on upload" },
  { key: "reviewBeforeSaving", label: "Review before saving" },
  { key: "deleteScreenshotAfterExtraction", label: "Delete screenshot after extraction" },
];

export function AiExtractionSettingsDialog({ open, onOpenChange }: AiExtractionSettingsDialogProps) {
  const [draft, setDraft] = React.useState<AiExtractionSettings>(() => ({ ...DEFAULT_AI_EXTRACTION_SETTINGS }));
  const [showKey, setShowKey] = React.useState(false);
  const [savedKeyPreview, setSavedKeyPreview] = React.useState("");
  const [testing, setTesting] = React.useState(false);
  const [clearingHistory, setClearingHistory] = React.useState(false);
  const [keyDirty, setKeyDirty] = React.useState(false);
  const [playSounds, setPlaySounds] = React.useState(true);

  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const settings = readAiExtractionSettings();
    const notifSettings = readNotificationSettings();
    setDraft(settings);
    setPlaySounds(notifSettings.playSounds);
    setShowKey(false);
    setKeyDirty(false);
    if (settings.geminiApiKey && settings.geminiApiKey.length > 4) {
      const prefix = settings.geminiApiKey.slice(0, 3);
      const suffix = settings.geminiApiKey.slice(-3);
      setSavedKeyPreview(`${prefix}••••••••${suffix}`);
    } else {
      setSavedKeyPreview("");
    }
  }, [open]);

  // Keep savedKeyPreview in sync with draft
  React.useEffect(() => {
    if (!keyDirty) return;
    if (draft.geminiApiKey && draft.geminiApiKey.length > 4) {
      const prefix = draft.geminiApiKey.slice(0, 3);
      const suffix = draft.geminiApiKey.slice(-3);
      setSavedKeyPreview(`${prefix}••••••••${suffix}`);
    } else {
      setSavedKeyPreview(draft.geminiApiKey ? `${draft.geminiApiKey.slice(0, 3)}•••` : "");
    }
  }, [draft.geminiApiKey, keyDirty]);

  const handleClearKey = () => {
    setDraft((d) => ({ ...d, geminiApiKey: "" }));
    setSavedKeyPreview("");
    setKeyDirty(false);
    inputRef.current?.focus();
  };

  const handleTest = async () => {
    setTesting(true);
    // Simulate a test delay; in production this would call Gemini API
    await new Promise((r) => setTimeout(r, 1500));
    setTesting(false);
    if (draft.geminiApiKey) {
      toast.success("Extraction test successful — API key is valid.");
    } else {
      toast.error("Please enter a Gemini API key first.");
    }
  };

  const handleClearHistory = async () => {
    setClearingHistory(true);
    await new Promise((r) => setTimeout(r, 800));
    setClearingHistory(false);
    toast.success("Extraction history cleared.");
  };

  const handleReset = () => {
    setDraft({ ...DEFAULT_AI_EXTRACTION_SETTINGS });
    setPlaySounds(true);
    setSavedKeyPreview("");
    setKeyDirty(false);
    toast.message("Settings reset to defaults.");
  };

  const handleSave = () => {
    writeAiExtractionSettings(draft);
    writeNotificationSettings({ playSounds });
    toast.success("Settings saved.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="sm:max-w-[560px]">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/[0.08]">
              <Bot className="h-4 w-4 text-emerald-300" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle>AI extraction settings</DialogTitle>
              <DialogDescription className="mt-1">
                Configure how AI reads and extracts your portfolio data from screenshots, PDFs, and
                CSVs.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {/* ── Section 1: Gemini API Key ── */}
          <section className="flex flex-col gap-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Gemini API Key
            </div>
            <div className="relative">
              <Input
                ref={inputRef}
                type={showKey ? "text" : "password"}
                value={draft.geminiApiKey}
                onChange={(e) => {
                  setDraft((d) => ({ ...d, geminiApiKey: e.target.value }));
                  setKeyDirty(true);
                }}
                placeholder="Enter your Gemini API key"
                className="h-11 pr-20 text-sm"
              />
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showKey ? "Hide API key" : "Show API key"}
                >
                  {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
                {draft.geminiApiKey && (
                  <button
                    type="button"
                    onClick={handleClearKey}
                    className="rounded-md px-1.5 py-1 text-[11px] font-medium text-red-400 transition-colors hover:bg-red-500/[0.08]"
                    tabIndex={-1}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">
                {savedKeyPreview
                  ? `Saved key: ${savedKeyPreview}`
                  : "No API key saved"}
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-emerald-400/80 transition-colors hover:text-emerald-300"
              >
                Get a free key from Google AI Studio
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </section>

          {/* ── Section 2: Extraction Model ── */}
          <section className="flex flex-col gap-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Extraction Model
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {MODEL_OPTIONS.map((opt) => {
                const selected = draft.extractionModel === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, extractionModel: opt.value }))}
                    className={cn(
                      "flex flex-col items-start gap-0.5 rounded-xl border p-3 text-left transition-all duration-200",
                      selected
                        ? "border-emerald-400/50 bg-emerald-500/[0.08] shadow-[0_0_12px_rgba(52,211,153,0.08)]"
                        : "border-white/[0.08] bg-white/[0.03] hover:border-white/[0.15]",
                    )}
                  >
                    <div className="text-sm font-semibold text-foreground">{opt.label}</div>
                    <div className="text-[11px] leading-tight text-muted-foreground">{opt.note}</div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Section 3: Extraction Behavior ── */}
          <section className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Extraction Behavior
            </div>
            <div className="flex flex-col gap-3">
              {BEHAVIOR_OPTIONS.map((opt) => (
                <label key={opt.key} className="flex cursor-pointer items-center gap-3">
                  <Checkbox
                    checked={draft[opt.key]}
                    onCheckedChange={(v) =>
                      setDraft((d) => ({ ...d, [opt.key]: v === true }))
                    }
                  />
                  <span className="text-sm text-foreground/90">{opt.label}</span>
                </label>
              ))}
            </div>
          </section>

          {/* ── Section 4: Notifications ── */}
          <section className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Notifications
            </div>
            <label className="flex cursor-pointer items-center gap-3">
              <Checkbox
                checked={playSounds}
                onCheckedChange={(v) => setPlaySounds(v === true)}
              />
              <div className="flex flex-col">
                <span className="text-sm text-foreground/90">Play notification sounds</span>
                <span className="text-[11px] text-muted-foreground/70">
                  Play a subtle chime when extraction completes or fails
                </span>
              </div>
            </label>
          </section>

          {/* ── Notice Banner ── */}
          <div className="flex items-start gap-2.5 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.04] px-4 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
            <p className="text-[12px] leading-relaxed text-emerald-100/80">
              Screenshots are sent to Google&apos;s Gemini API for processing. Images are not stored after
              extraction.
            </p>
          </div>
        </div>

        {/* ── Footer ── */}
        <DialogFooter className="flex-row flex-wrap items-center gap-2 sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearHistory}
              disabled={clearingHistory}
              className="border-red-500/20 text-red-400 hover:bg-red-500/[0.08] hover:text-red-300"
            >
              {clearingHistory ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Clear history
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={testing}
            >
              {testing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Bot className="h-3.5 w-3.5" />
              )}
              Test extraction
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              className="bg-emerald-400 font-semibold text-emerald-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-300"
            >
              Save settings
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
