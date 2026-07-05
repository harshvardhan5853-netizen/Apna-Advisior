"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  ExternalLink,
  KeyRound,
  Loader2,
  Sparkles,
  ShieldCheck,
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
  DEFAULT_NEWS_SETTINGS,
  maskGeminiKey,
  readNewsSettings,
  writeNewsSettings,
  type NewsSettings,
} from "@/lib/news/settings";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after Save with the new settings (or Clear-key resets partial). */
  onSaved?: (settings: NewsSettings) => void;
}

interface DraftState {
  geminiApiKey: string;
  model: string;
  autoRefresh: boolean;
  autoRefreshMinutes: number;
}

const MODEL_OPTIONS: Array<{ value: string; label: string; note: string }> = [
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", note: "Fast · balanced quality (recommended)" },
  { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite", note: "Cheapest · slightly weaker" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", note: "Best quality · lower free quota" },
];

export function SettingsDialog({ open, onOpenChange, onSaved }: SettingsDialogProps) {
  const [draft, setDraft] = React.useState<DraftState>(() => ({
    geminiApiKey: "",
    model: DEFAULT_NEWS_SETTINGS.model,
    autoRefresh: DEFAULT_NEWS_SETTINGS.autoRefresh,
    autoRefreshMinutes: DEFAULT_NEWS_SETTINGS.autoRefreshMinutes,
  }));
  const [showKey, setShowKey] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [saved, setSaved] = React.useState<NewsSettings | null>(null);

  // On dialog open, hydrate draft from current localStorage settings.
  React.useEffect(() => {
    if (!open) return;
    const current = readNewsSettings();
    setSaved(current);
    setDraft({
      geminiApiKey: current.geminiApiKey ?? "",
      model: current.model,
      autoRefresh: current.autoRefresh,
      autoRefreshMinutes: current.autoRefreshMinutes,
    });
    setShowKey(false);
  }, [open]);

  const keyTrim = draft.geminiApiKey.trim();
  const keyValid = keyTrim.length >= 20;
  const savedMask = saved?.geminiApiKey ? maskGeminiKey(saved.geminiApiKey) : "";

  const handleTest = async () => {
    if (!keyValid) {
      toast.error("Enter a Gemini API key first (starts with AIza…, 20+ characters).");
      return;
    }
    setTesting(true);
    try {
      const res = await fetch("/api/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ping: true,
          geminiApiKey: keyTrim,
          model: draft.model,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        toast.success("Gemini key verified — you're good to go.");
      } else {
        const detail = data.detail || data.error || `HTTP ${res.status}`;
        toast.error(`Key rejected: ${detail}`);
      }
    } catch (err) {
      toast.error(`Test failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const next = writeNewsSettings({
      geminiApiKey: keyValid ? keyTrim : null,
      model: draft.model,
      autoRefresh: draft.autoRefresh,
      autoRefreshMinutes: Math.max(5, Math.min(120, draft.autoRefreshMinutes)),
    });
    toast.success(next.geminiApiKey ? "News settings saved." : "News settings saved (running in RSS-only mode).");
    onSaved?.(next);
    onOpenChange(false);
  };

  const handleClearKey = () => {
    setDraft((d) => ({ ...d, geminiApiKey: "" }));
    setShowKey(false);
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
              <DialogTitle>News Intelligence settings</DialogTitle>
              <DialogDescription>
                Bring your own Gemini API key. It stays in your browser and only travels to Google&rsquo;s
                servers via our proxy — never stored on our side.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {/* Gemini API key */}
          <section className="flex flex-col gap-2">
            <label htmlFor="gemini-key" className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <KeyRound className="h-3.5 w-3.5" /> Gemini API key
            </label>
            <div className="relative">
              <Input
                id="gemini-key"
                type={showKey ? "text" : "password"}
                autoComplete="off"
                spellCheck={false}
                placeholder="AIzaSy…"
                value={draft.geminiApiKey}
                onChange={(e) => setDraft((d) => ({ ...d, geminiApiKey: e.target.value }))}
                className="pr-24 font-mono"
              />
              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowKey((s) => !s)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                  title={showKey ? "Hide key" : "Reveal key"}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                {draft.geminiApiKey && (
                  <button
                    type="button"
                    onClick={handleClearKey}
                    className="rounded-lg px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-red-300 hover:bg-red-500/[0.08]"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div className="text-muted-foreground">
                {savedMask ? (
                  <>Saved key: <span className="font-mono text-foreground/80">{savedMask}</span></>
                ) : (
                  "No key saved yet — news will load in RSS-only mode."
                )}
              </div>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-emerald-300 hover:underline"
              >
                Get a free key from Google AI Studio
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </section>

          {/* Model picker */}
          <section className="flex flex-col gap-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Analysis model</div>
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

          {/* Auto-refresh */}
          <section className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <label className="flex items-center gap-3">
              <Checkbox
                checked={draft.autoRefresh}
                onCheckedChange={(v) => setDraft((d) => ({ ...d, autoRefresh: v === true }))}
              />
              <div className="flex flex-col">
                <div className="text-sm font-semibold text-foreground">Auto-refresh news</div>
                <div className="text-[11px] text-muted-foreground">Poll while this tab is open.</div>
              </div>
            </label>
            <div className={cn("flex items-center gap-3", !draft.autoRefresh && "opacity-40 pointer-events-none")}>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Every</div>
              <input
                type="range"
                min={5}
                max={120}
                step={5}
                value={draft.autoRefreshMinutes}
                onChange={(e) => setDraft((d) => ({ ...d, autoRefreshMinutes: Number(e.target.value) }))}
                className="flex-1 accent-emerald-400"
              />
              <div className="min-w-[70px] text-right money-tabular text-sm font-semibold text-emerald-300">
                {draft.autoRefreshMinutes} min
              </div>
            </div>
          </section>

          {/* Privacy note */}
          <div className="flex items-start gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.04] p-3 text-[12px] text-emerald-100/80">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
            <div>
              Your API key is stored in <code>localStorage</code> on this device only. It&rsquo;s sent to
              Google&rsquo;s Gemini endpoint via our server (which never persists it). Clearing your browser
              storage removes it entirely.
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleTest} disabled={testing || !keyValid}>
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Test key
          </Button>
          <Button onClick={handleSave}>Save settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
