// AI Assistant settings kept in browser localStorage.
// Mirrors the News settings persistence pattern. No portfolio data is stored here.

const KEY = "apna-advisor.ai-settings.v1";

export type ResponseDetail = "minimal" | "balanced" | "detailed";

export interface AiSettings {
  /** Preferred model; default "gemini-2.5-flash". */
  model: string;
  /** Which AI-powered capabilities are enabled. */
  features: {
    portfolioAnalysis: boolean;
    riskDetection: boolean;
    investmentSuggestions: boolean;
    marketInsights: boolean;
    chatAssistance: boolean;
  };
  /** Verbosity of AI responses. */
  responseDetail: ResponseDetail;
  /** Background/automation toggles. */
  autoRefreshInsights: boolean;
  healthMonitoring: boolean;
  rememberChatContext: boolean;
}

export const DEFAULT_AI_SETTINGS: AiSettings = {
  model: "gemini-2.5-flash",
  features: {
    portfolioAnalysis: true,
    riskDetection: true,
    investmentSuggestions: true,
    marketInsights: true,
    chatAssistance: true,
  },
  responseDetail: "balanced",
  autoRefreshInsights: true,
  healthMonitoring: true,
  rememberChatContext: true,
};

const MODEL_VALUES = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
];

const DETAIL_VALUES: ResponseDetail[] = ["minimal", "balanced", "detailed"];

function clampDetail(value: unknown): ResponseDetail {
  return DETAIL_VALUES.includes(value as ResponseDetail)
    ? (value as ResponseDetail)
    : DEFAULT_AI_SETTINGS.responseDetail;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readAiSettings(): AiSettings {
  if (!isBrowser()) return structuredCloneSafe(DEFAULT_AI_SETTINGS);
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return structuredCloneSafe(DEFAULT_AI_SETTINGS);
    const parsed = JSON.parse(raw) as Partial<AiSettings>;
    return {
      ...DEFAULT_AI_SETTINGS,
      ...parsed,
      model: MODEL_VALUES.includes(parsed.model ?? "")
        ? parsed.model!
        : DEFAULT_AI_SETTINGS.model,
      features: { ...DEFAULT_AI_SETTINGS.features, ...(parsed.features ?? {}) },
      responseDetail: clampDetail(parsed.responseDetail),
    };
  } catch {
    return structuredCloneSafe(DEFAULT_AI_SETTINGS);
  }
}

export function writeAiSettings(next: Partial<AiSettings>): AiSettings {
  const current = readAiSettings();
  const merged: AiSettings = {
    ...current,
    ...next,
    features: { ...current.features, ...(next.features ?? {}) },
  };
  if (!isBrowser()) return merged;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(merged));
  } catch {
    /* quota exceeded — ignore, in-memory copy still fine for the session */
  }
  return merged;
}

function structuredCloneSafe(value: AiSettings): AiSettings {
  return JSON.parse(JSON.stringify(value)) as AiSettings;
}
