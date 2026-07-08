"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Bot,
  Loader2,
  ShieldCheck,
  Sparkles,
  X,
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
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  DEFAULT_AI_SETTINGS,
  readAiSettings,
  writeAiSettings,
  type AiSettings,
  type ResponseDetail,
} from "@/lib/ai-settings";

interface AiSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after Save with the new settings. */
  onSaved?: (settings: AiSettings) => void;
}

const MODEL_OPTIONS: Array<{ value: string; label: string; note: string }> = [
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", note: "Fast · balanced quality (recommended)" },
  { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite", note: "Cheapest · slightly weaker" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", note: "Best quality · lower free quota" },
];

const FEATURE_OPTIONS: Array<{ key: keyof AiSettings["features"]; label: string }> = [
  { key: "portfolioAnalysis", label: "Portfolio Analysis" },
  { key: "riskDetection", label: "Risk Detection" },
  { key: "investmentSuggestions", label: "Investment Suggestions" },
  { key: "marketInsights", label: "Market Insights" },
  { key: "chatAssistance", label: "Chat Assistance" },
];

const DETAIL_OPTIONS: Array<{ value: ResponseDetail; label: string }> = [
  { value: "minimal", label: "Minimal" },
  { value: "balanced", label: "Balanced" },
  { value: "detailed", label: "Detailed" },
];

const AUTO_OPTIONS: Array<{ key: "autoRefreshInsights" | "healthMonitoring" | "rememberChatContext"; label: string; note: string }> = [
  { key: "autoRefreshInsights", label: "Auto-refresh market insights", note: "Keep the insights panel fresh while this tab is open." },
  { key: "healthMonitoring", label: "Enable portfolio health monitoring", note: "Flag concentration and drawdown risks automatically." },
  { key: "rememberChatContext", label: "Remember chat context", note: "Retain recent conversation so the assistant stays in context." },
];

export function AiSettingsDialog({ open, onOpenChange, onSaved }: AiSettingsDialogProps) {
  const [draft, setDraft] = React.useState<AiSettings>(() => ({ ...DEFAULT_AI_SETTINGS }));
  const [testing, setTesting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setDraft(readAiSettings());
  }, [open]);

  const setFeature = (key: keyof AiSettings["features"], value: boolean) =>
    setDraft((d) => ({ ...d, features: { ...d.features, [key]: value } }));
  const setAuto = (key: "autoRefreshInsights" | "healthMonitoring" | "rememberChatContext", value: boolean) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ping: true, model: draft.model }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        toast.success("AI assistant is reachable — model verified.");
      } else {
        const detail = data.detail || data.error || `HTTP ${res.status}`;
        toast.error(`AI test failed: ${detail}`);
      }
    } catch (err) {
      toast.error(`AI test failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const next = writeAiSettings(draft);
    toast.success("AI Assistant settings saved.");
    onSaved?.(next);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/[0.08]">
              <Sparkles className="h-4 w-4 text-emerald-300" />
            </div>
            <div>
              <DialogTitle>AI Assistant Settings</DialogTitle>
              <DialogDescription>
                Configure how the AI assistant analyzes portfolios, generates insights, and assists
                with investment decisions.
              </DialogDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {/* Section 1 — AI Model */}
          <section className="flex flex-col gap-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">AI Model</div>
            <div className="grid gap-2 sm:grid-cols-3">
              {MODEL_OPTIONS.map((opt) => {
                const selected = draft.model === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, model: opt.value }))}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors",
                      selected
                        ? "border-emerald-400/50 bg-emerald-500/[0.08] shadow-glow-emerald"
                        : "border-white/[0.08] bg-white/[0.03] hover:border-white/15",
                    )}
                  >
                    <div className="text-sm font-semibold text-foreground">{opt.label}</div>
                    <div className="text-[11px] text-muted-foreground">{opt.note}</div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Section 2 — Analysis Features */}
          <section className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Analysis Features</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {FEATURE_OPTIONS.map((f) => (
                <label key={f.key} className="flex items-center gap-3">
                  <Checkbox
                    checked={draft.features[f.key]}
                    onCheckedChange={(v) => setFeature(f.key, v === true)}
                  />
                  <span className="text-sm text-foreground">{f.label}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Section 3 — Response Preferences */}
          <section className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Response Preferences</div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Response detail</span>
              <div className="ml-auto flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] p-1">
                {DETAIL_OPTIONS.map((opt) => {
                  const selected = draft.responseDetail === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, responseDetail: opt.value }))}
                      className={cn(
                        "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                        selected
                          ? "bg-emerald-500/[0.12] text-emerald-200"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Section 4 — Auto Features */}
          <section className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Auto Features</div>
            {AUTO_OPTIONS.map((opt) => (
              <label key={opt.key} className="flex items-center gap-3">
                <Checkbox
                  checked={draft[opt.key]}
                  onCheckedChange={(v) => setAuto(opt.key, v === true)}
                />
                <div className="flex flex-col">
                  <div className="text-sm font-semibold text-foreground">{opt.label}</div>
                  <div className="text-[11px] text-muted-foreground">{opt.note}</div>
                </div>
              </label>
            ))}
          </section>

          {/* Section 5 — Privacy */}
          <div className="flex items-start gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.04] p-3 text-[12px] text-emerald-100/80">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
            <div>
              Your AI preferences are stored locally in this browser. No portfolio data is permanently
              stored by the settings system.
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleTest} disabled={testing}>
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
            Test AI
          </Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
