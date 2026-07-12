// AI extraction settings for the Add Portfolio card — how AI reads and extracts
// portfolio data from screenshots, PDFs, and CSVs. Persisted in localStorage.

const KEY = "apna-advisor.ai-extraction-settings.v1";

export type ExtractionModel = "gemini-2.5-flash" | "gemini-2.5-flash-lite" | "gemini-2.5-pro";

export interface AiExtractionSettings {
  geminiApiKey: string;
  extractionModel: ExtractionModel;
  autoExtractOnUpload: boolean;
  reviewBeforeSaving: boolean;
  deleteScreenshotAfterExtraction: boolean;
}

export const DEFAULT_AI_EXTRACTION_SETTINGS: AiExtractionSettings = {
  geminiApiKey: "",
  extractionModel: "gemini-2.5-flash",
  autoExtractOnUpload: true,
  reviewBeforeSaving: true,
  deleteScreenshotAfterExtraction: false,
};

const MODEL_VALUES: ExtractionModel[] = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
];

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readAiExtractionSettings(): AiExtractionSettings {
  if (!isBrowser()) return { ...DEFAULT_AI_EXTRACTION_SETTINGS };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_AI_EXTRACTION_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AiExtractionSettings>;
    return {
      ...DEFAULT_AI_EXTRACTION_SETTINGS,
      ...parsed,
      extractionModel: MODEL_VALUES.includes(parsed.extractionModel as ExtractionModel)
        ? (parsed.extractionModel as ExtractionModel)
        : DEFAULT_AI_EXTRACTION_SETTINGS.extractionModel,
    };
  } catch {
    return { ...DEFAULT_AI_EXTRACTION_SETTINGS };
  }
}

export function writeAiExtractionSettings(next: Partial<AiExtractionSettings>): AiExtractionSettings {
  const current = readAiExtractionSettings();
  const merged: AiExtractionSettings = { ...current, ...next };
  if (!isBrowser()) return merged;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(merged));
  } catch {
    /* quota exceeded — ignore */
  }
  return merged;
}
