import type { TargetPresetOption } from "@/types/target-portfolio";
import { lookupStock } from "@/lib/enrichment/nse-static";

/**
 * Preset target allocation templates for CreateTargetDialog.
 * The BALANCED preset matches Card 4 spec exactly (10 stocks, sums to 100%).
 */

function meta(symbol: string, fallbackName: string) {
  const m = lookupStock(symbol);
  return {
    symbol: m?.symbol ?? symbol,
    stockName: m?.name ?? fallbackName,
    sector: m?.sector ?? null,
  };
}

const BALANCED: TargetPresetOption = {
  key: "balanced",
  label: "Balanced (10 stocks)",
  description: "Curated 10-stock mix from the Apna Advisor brief. Sums to 100%.",
  allocations: [
    { ...meta("ICICIBANK", "ICICI Bank"), targetPercent: 13 },
    { ...meta("CHOLAFIN", "Cholamandalam Investment"), targetPercent: 11 },
    { ...meta("CDSL", "Central Depository Services"), targetPercent: 11 },
    { ...meta("POLYCAB", "Polycab India"), targetPercent: 11 },
    { ...meta("TRENT", "Trent"), targetPercent: 11 },
    { ...meta("LT", "Larsen & Toubro"), targetPercent: 11 },
    { ...meta("BEL", "Bharat Electronics"), targetPercent: 9 },
    { ...meta("DATAPATTNS", "Data Patterns India"), targetPercent: 8 },
    { ...meta("NH", "Narayana Hrudayalaya"), targetPercent: 8 },
    { ...meta("BLUESTARCO", "Blue Star"), targetPercent: 7 },
  ],
};

const LONG_TERM: TargetPresetOption = {
  key: "long-term",
  label: "Long-term compounders (8 stocks)",
  description: "Bank + IT + FMCG + industrial blue chips for buy-and-hold.",
  allocations: [
    { ...meta("HDFCBANK", "HDFC Bank"), targetPercent: 15 },
    { ...meta("ICICIBANK", "ICICI Bank"), targetPercent: 15 },
    { ...meta("TCS", "Tata Consultancy Services"), targetPercent: 15 },
    { ...meta("INFY", "Infosys"), targetPercent: 12 },
    { ...meta("HINDUNILVR", "Hindustan Unilever"), targetPercent: 12 },
    { ...meta("ASIANPAINT", "Asian Paints"), targetPercent: 11 },
    { ...meta("LT", "Larsen & Toubro"), targetPercent: 10 },
    { ...meta("RELIANCE", "Reliance Industries"), targetPercent: 10 },
  ],
};

const DIVIDEND: TargetPresetOption = {
  key: "dividend",
  label: "Dividend income tilt (7 stocks)",
  description: "PSUs + FMCG + utilities that historically pay steady dividends.",
  allocations: [
    { ...meta("ITC", "ITC"), targetPercent: 18 },
    { ...meta("COALINDIA", "Coal India"), targetPercent: 16 },
    { ...meta("POWERGRID", "Power Grid Corporation"), targetPercent: 15 },
    { ...meta("NTPC", "NTPC"), targetPercent: 14 },
    { ...meta("HINDUNILVR", "Hindustan Unilever"), targetPercent: 13 },
    { ...meta("HDFCBANK", "HDFC Bank"), targetPercent: 12 },
    { ...meta("TCS", "Tata Consultancy Services"), targetPercent: 12 },
  ],
};

const AGGRESSIVE: TargetPresetOption = {
  key: "aggressive",
  label: "Aggressive growth (9 stocks)",
  description: "Mid-cap heavy, higher beta, momentum-flavoured picks.",
  allocations: [
    { ...meta("TRENT", "Trent"), targetPercent: 13 },
    { ...meta("DIXON", "Dixon Technologies"), targetPercent: 12 },
    { ...meta("POLYCAB", "Polycab India"), targetPercent: 12 },
    { ...meta("DATAPATTNS", "Data Patterns India"), targetPercent: 11 },
    { ...meta("BEL", "Bharat Electronics"), targetPercent: 11 },
    { ...meta("CDSL", "Central Depository Services"), targetPercent: 11 },
    { ...meta("BLUESTARCO", "Blue Star"), targetPercent: 10 },
    { ...meta("CHOLAFIN", "Cholamandalam Investment"), targetPercent: 10 },
    { ...meta("ANGELONE", "Angel One"), targetPercent: 10 },
  ],
};

const BLANK: TargetPresetOption = {
  key: "blank",
  label: "Start blank",
  description: "Add stocks and set your own weights from scratch.",
  allocations: [],
};

export const TARGET_PRESETS: TargetPresetOption[] = [BALANCED, LONG_TERM, DIVIDEND, AGGRESSIVE, BLANK];

export function getPreset(key: string | null | undefined): TargetPresetOption | null {
  if (!key) return null;
  return TARGET_PRESETS.find((p) => p.key === key) ?? null;
}
