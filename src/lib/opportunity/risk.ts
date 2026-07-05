import type { PriceHistory, RiskIndicators, RiskLevel } from '@/types/opportunity';
import type { StaticStockMeta } from '@/lib/enrichment/nse-static';

const TRADING_DAYS = 252;

const SECTOR_RISK_MAP: Record<string, string> = {
  'Information Technology': 'Cyclical — global demand + rupee sensitivity',
  'Financial Services': 'Rate cycle + credit-cost sensitivity',
  'Banking': 'Rate cycle + NPA sensitivity',
  'Healthcare': 'Regulatory + pricing pressure',
  'Pharmaceuticals': 'FDA + USFDA + pricing risk',
  'Consumer Staples': 'Defensive — margin pressure from raw materials',
  'Consumer Discretionary': 'Cyclical — demand-linked',
  'Energy': 'Commodity price + policy risk',
  'Utilities': 'Regulated — moderate risk',
  'Industrials': 'Capex-cycle sensitive',
  'Materials': 'Commodity cyclical',
  'Communication Services': 'Regulatory + capex heavy',
  'Real Estate': 'Interest-rate + cycle sensitive',
  'Automobile': 'Cyclical — demand + input cost',
  'Metals': 'Global commodity cyclical',
  'Chemicals': 'Cyclical — input cost sensitivity',
};

function clamp(n: number, lo = 0, hi = 1): number {
  return Math.min(hi, Math.max(lo, n));
}

function computeVolatility(closes: number[]): number | null {
  if (closes.length < 20) return null;
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const prev = closes[i - 1];
    const curr = closes[i];
    if (!Number.isFinite(prev) || !Number.isFinite(curr) || prev <= 0) continue;
    returns.push(Math.log(curr / prev));
  }
  if (returns.length < 10) return null;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / returns.length;
  const stdev = Math.sqrt(variance);
  return stdev * Math.sqrt(TRADING_DAYS);
}

function computeMaxDrawdown(closes: number[]): number | null {
  if (closes.length < 20) return null;
  let peak = closes[0];
  let maxDd = 0;
  for (const c of closes) {
    if (!Number.isFinite(c) || c <= 0) continue;
    if (c > peak) peak = c;
    if (peak > 0) {
      const dd = (peak - c) / peak;
      if (dd > maxDd) maxDd = dd;
    }
  }
  return maxDd;
}

function marketCapRiskLabel(meta: StaticStockMeta | null): { level: RiskLevel; label: string } {
  const cap = meta?.marketCap ?? 'Unknown';
  if (cap === 'Large') return { level: 'low', label: 'Large-cap — liquidity + stability' };
  if (cap === 'Mid') return { level: 'medium', label: 'Mid-cap — moderate volatility' };
  if (cap === 'Small') return { level: 'high', label: 'Small-cap — higher volatility + liquidity risk' };
  return { level: 'medium', label: 'Market-cap unclassified' };
}

function sectorRiskLabel(meta: StaticStockMeta | null): string {
  const sector = meta?.sector;
  if (!sector) return 'Sector unclassified';
  return SECTOR_RISK_MAP[sector] ?? `${sector} — sector-specific risk applies`;
}

function volatilityLevel(vol: number | null): RiskLevel {
  if (vol == null) return 'medium';
  if (vol >= 0.45) return 'very-high';
  if (vol >= 0.30) return 'high';
  if (vol >= 0.20) return 'medium';
  return 'low';
}

function drawdownLevel(dd: number | null): RiskLevel {
  if (dd == null) return 'medium';
  if (dd >= 0.50) return 'very-high';
  if (dd >= 0.35) return 'high';
  if (dd >= 0.20) return 'medium';
  return 'low';
}

const LEVEL_WEIGHT: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, 'very-high': 3 };
const LEVELS: RiskLevel[] = ['low', 'medium', 'high', 'very-high'];

function combineLevels(...levels: RiskLevel[]): RiskLevel {
  if (levels.length === 0) return 'medium';
  const avg = levels.reduce((a, l) => a + LEVEL_WEIGHT[l], 0) / levels.length;
  const idx = Math.round(clamp(avg, 0, 3));
  return LEVELS[idx];
}

export interface RiskInputMeta {
  sector?: string | null;
  marketCap?: StaticStockMeta['marketCap'] | null;
}

export function computeRisk(
  history: PriceHistory | null,
  meta: StaticStockMeta | null,
  allocationPercent?: number | null,
): RiskIndicators {
  const closes = history?.closes ?? [];
  const volatility = computeVolatility(closes);
  const drawdown = computeMaxDrawdown(closes);

  const volLevel = volatilityLevel(volatility);
  const ddLevel = drawdownLevel(drawdown);
  const capInfo = marketCapRiskLabel(meta);
  const level = combineLevels(volLevel, ddLevel, capInfo.level);

  const notes: string[] = [];
  if (volatility != null) {
    notes.push(`Annualised volatility ~${(volatility * 100).toFixed(1)}%`);
  } else {
    notes.push('Volatility unavailable (insufficient price history)');
  }
  if (drawdown != null) {
    notes.push(`Max 1-year drawdown ~${(drawdown * 100).toFixed(1)}%`);
  }
  notes.push(`Market-cap risk: ${capInfo.label}`);
  notes.push(`Sector risk: ${sectorRiskLabel(meta)}`);
  if (allocationPercent != null && allocationPercent > 15) {
    notes.push(`Concentration risk — this stock is ${allocationPercent.toFixed(1)}% of your portfolio`);
  }

  return {
    level,
    volatility,
    drawdownFromHigh: drawdown,
    sectorRisk: sectorRiskLabel(meta),
    marketCapRisk: capInfo.label,
    notes,
  };
}
