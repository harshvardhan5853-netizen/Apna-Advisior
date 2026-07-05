/**
 * Portfolio-level analytics: XIRR, CAGR, Sharpe, Sortino, Alpha, Beta,
 * Max Drawdown, Volatility, and Concentration (HHI).
 *
 * Kept as pure functions (no React, no fetch) so the summary layer can call
 * them synchronously off of already-loaded holdings + a portfolio value
 * time-series returned by /api/portfolio-history.
 *
 * NOTE: XIRR uses holding.importedAt as the cash-outflow date. CAGR uses the
 * earliest holding.importedAt as start. If a holding lacks importedAt we
 * fall back to a synthetic date one year ago so the metric still degrades
 * gracefully instead of returning NaN.
 */

import type { CombinedHolding } from "@/types/portfolio";

const MS_PER_DAY = 86_400_000;
const DAYS_PER_YEAR = 365.25;
const RISK_FREE_ANNUAL = 0.07; // 7% India 10y-ish, used for Sharpe/Sortino/Alpha.
const RISK_FREE_DAILY = RISK_FREE_ANNUAL / DAYS_PER_YEAR;

export interface PortfolioAnalytics {
  /** Money-weighted annualized return. Fractional (0.15 = 15%). null when insufficient data. */
  xirr: number | null;
  /** Time-weighted annualized return based on earliest cost-basis. Fractional. */
  cagr: number | null;
  /** Sharpe ratio using RISK_FREE_ANNUAL as baseline. Requires portfolio return series. */
  sharpe: number | null;
  /** Sortino uses only downside deviation. */
  sortino: number | null;
  /** Jensen's alpha vs supplied market series (annualized fraction). */
  alpha: number | null;
  /** Portfolio beta = cov(port, mkt) / var(mkt). Requires equal-length series. */
  beta: number | null;
  /** Peak-to-trough drop, fractional (0.32 = 32% max drawdown). */
  maxDrawdown: number | null;
  /** Annualized volatility (std dev of daily returns × sqrt(252)), fractional. */
  volatility: number | null;
  /** Herfindahl-Hirschman index of allocation percents, 0..10000. High = concentrated. */
  concentrationHHI: number | null;
}

export const EMPTY_ANALYTICS: PortfolioAnalytics = {
  xirr: null,
  cagr: null,
  sharpe: null,
  sortino: null,
  alpha: null,
  beta: null,
  maxDrawdown: null,
  volatility: null,
  concentrationHHI: null,
};

/**
 * XIRR via Newton-Raphson. Cashflows are (date, amount) tuples where
 * outflows (invested capital) are NEGATIVE and inflows (current value)
 * are POSITIVE. Returns fractional annual rate or null if unsolvable.
 */
export function computeXirr(cashflows: Array<{ date: number; amount: number }>, guess = 0.1): number | null {
  if (cashflows.length < 2) return null;
  const hasPositive = cashflows.some((c) => c.amount > 0);
  const hasNegative = cashflows.some((c) => c.amount < 0);
  if (!hasPositive || !hasNegative) return null;

  const t0 = cashflows[0].date;
  const years = cashflows.map((c) => (c.date - t0) / MS_PER_DAY / DAYS_PER_YEAR);

  const npv = (rate: number) => {
    let sum = 0;
    for (let i = 0; i < cashflows.length; i++) sum += cashflows[i].amount / Math.pow(1 + rate, years[i]);
    return sum;
  };
  const npvPrime = (rate: number) => {
    let sum = 0;
    for (let i = 0; i < cashflows.length; i++) sum += -years[i] * cashflows[i].amount / Math.pow(1 + rate, years[i] + 1);
    return sum;
  };

  let rate = guess;
  for (let i = 0; i < 100; i++) {
    const y = npv(rate);
    if (!Number.isFinite(y)) return null;
    if (Math.abs(y) < 1e-6) return rate;
    const yp = npvPrime(rate);
    if (!Number.isFinite(yp) || yp === 0) return null;
    const next = rate - y / yp;
    if (!Number.isFinite(next)) return null;
    if (Math.abs(next - rate) < 1e-8) return next;
    rate = next < -0.9999 ? -0.9999 : next;
  }
  return null;
}

/**
 * CAGR = (end/start)^(1/years) - 1. When years < 30 days we fall back to
 * simple total return so the tile doesn't display a wildly extrapolated
 * annualized number based on very little history.
 */
export function computeCagr(startValue: number, endValue: number, years: number): number | null {
  if (!Number.isFinite(startValue) || !Number.isFinite(endValue) || startValue <= 0 || endValue <= 0) return null;
  if (!Number.isFinite(years) || years <= 0) return null;
  if (years < 30 / DAYS_PER_YEAR) return endValue / startValue - 1;
  return Math.pow(endValue / startValue, 1 / years) - 1;
}

/**
 * Concentration risk expressed as HHI on allocation percents (0..100 each).
 * Sum of squared shares. 10000 = single stock, ~1000 = 10 equal stocks.
 */
export function computeConcentrationHHI(allocationsPercent: number[]): number | null {
  if (allocationsPercent.length === 0) return null;
  let sum = 0;
  for (const p of allocationsPercent) sum += p * p;
  return sum;
}

function mean(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

function variance(xs: readonly number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  let s = 0;
  for (const x of xs) s += (x - m) * (x - m);
  return s / (xs.length - 1);
}

function covariance(xs: readonly number[], ys: readonly number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  const mx = mean(xs.slice(-n));
  const my = mean(ys.slice(-n));
  let s = 0;
  for (let i = 0; i < n; i++) s += (xs[xs.length - n + i] - mx) * (ys[ys.length - n + i] - my);
  return s / (n - 1);
}

/** Daily returns → annualized standard deviation (approx 252 trading days). */
export function computeVolatility(dailyReturns: readonly number[]): number | null {
  if (dailyReturns.length < 5) return null;
  const v = variance(dailyReturns);
  if (!Number.isFinite(v) || v < 0) return null;
  return Math.sqrt(v) * Math.sqrt(252);
}

/** Sharpe = (mean daily excess return / std dev daily return) * sqrt(252). */
export function computeSharpe(dailyReturns: readonly number[], riskFreeDaily = RISK_FREE_DAILY): number | null {
  if (dailyReturns.length < 5) return null;
  const excess = dailyReturns.map((r) => r - riskFreeDaily);
  const m = mean(excess);
  const sd = Math.sqrt(variance(excess));
  if (!Number.isFinite(sd) || sd === 0) return null;
  return (m / sd) * Math.sqrt(252);
}

/** Sortino uses downside-only deviation. */
export function computeSortino(dailyReturns: readonly number[], riskFreeDaily = RISK_FREE_DAILY): number | null {
  if (dailyReturns.length < 5) return null;
  const excess = dailyReturns.map((r) => r - riskFreeDaily);
  const downside = excess.filter((r) => r < 0);
  if (downside.length < 2) return null;
  const dd = Math.sqrt(mean(downside.map((r) => r * r)));
  if (!Number.isFinite(dd) || dd === 0) return null;
  return (mean(excess) / dd) * Math.sqrt(252);
}

/** Peak-to-trough max drawdown from a value series. Fractional (0.30 = 30%). */
export function computeMaxDrawdown(values: readonly number[]): number | null {
  if (values.length < 2) return null;
  let peak = values[0];
  let maxDD = 0;
  for (const v of values) {
    if (v > peak) peak = v;
    if (peak > 0) {
      const dd = (peak - v) / peak;
      if (dd > maxDD) maxDD = dd;
    }
  }
  return maxDD;
}

/** Portfolio beta vs market (equal-length daily return arrays). */
export function computeBetaVsMarket(portfolioReturns: readonly number[], marketReturns: readonly number[]): number | null {
  const n = Math.min(portfolioReturns.length, marketReturns.length);
  if (n < 20) return null;
  const cov = covariance(portfolioReturns, marketReturns);
  const varM = variance(marketReturns.slice(-n));
  if (!Number.isFinite(varM) || varM <= 0) return null;
  return cov / varM;
}

/**
 * Jensen's alpha (annualized).
 * alpha = mean(rp - rf) - beta * mean(rm - rf), then annualized × 252.
 */
export function computeAlpha(
  portfolioReturns: readonly number[],
  marketReturns: readonly number[],
  beta: number | null,
  riskFreeDaily = RISK_FREE_DAILY,
): number | null {
  const n = Math.min(portfolioReturns.length, marketReturns.length);
  if (n < 20 || beta == null || !Number.isFinite(beta)) return null;
  const rp = portfolioReturns.slice(-n);
  const rm = marketReturns.slice(-n);
  const mp = mean(rp) - riskFreeDaily;
  const mm = mean(rm) - riskFreeDaily;
  return (mp - beta * mm) * 252;
}

/** Convenience: full analytics bundle from holdings + optional daily series. */
export function computePortfolioAnalytics(
  holdings: readonly CombinedHolding[],
  portfolioValueSeries?: readonly { t: number; value: number }[],
  marketDailyReturns?: readonly number[],
): PortfolioAnalytics {
  if (holdings.length === 0) return EMPTY_ANALYTICS;

  const now = Date.now();
  const totalInvested = holdings.reduce((s, h) => s + h.investedAmount, 0);
  const totalCurrent = holdings.reduce((s, h) => s + h.currentValue, 0);

  const flows: Array<{ date: number; amount: number }> = [];
  let earliest = now;
  for (const h of holdings) {
    if (h.investedAmount <= 0) continue;
    const importedAt = h.importedAt && h.importedAt > 0 ? h.importedAt : now - DAYS_PER_YEAR * MS_PER_DAY;
    if (importedAt < earliest) earliest = importedAt;
    flows.push({ date: importedAt, amount: -h.investedAmount });
  }
  flows.push({ date: now, amount: totalCurrent });
  flows.sort((a, b) => a.date - b.date);

  const yearsSinceEarliest = (now - earliest) / MS_PER_DAY / DAYS_PER_YEAR;
  const xirr = computeXirr(flows);
  const cagr = computeCagr(totalInvested, totalCurrent, yearsSinceEarliest);
  const concentrationHHI = computeConcentrationHHI(holdings.map((h) => h.allocationPercent));

  let portReturns: number[] = [];
  let values: number[] = [];
  let maxDrawdown: number | null = null;
  let volatility: number | null = null;
  let sharpe: number | null = null;
  let sortino: number | null = null;
  let beta: number | null = null;
  let alpha: number | null = null;

  if (portfolioValueSeries && portfolioValueSeries.length > 2) {
    values = portfolioValueSeries.map((p) => p.value).filter((v) => Number.isFinite(v) && v > 0);
    for (let i = 1; i < values.length; i++) {
      const r = values[i] / values[i - 1] - 1;
      if (Number.isFinite(r)) portReturns.push(r);
    }
    maxDrawdown = computeMaxDrawdown(values);
    volatility = computeVolatility(portReturns);
    sharpe = computeSharpe(portReturns);
    sortino = computeSortino(portReturns);
    if (marketDailyReturns && marketDailyReturns.length > 20) {
      beta = computeBetaVsMarket(portReturns, marketDailyReturns);
      alpha = computeAlpha(portReturns, marketDailyReturns, beta);
    }
  }

  return { xirr, cagr, sharpe, sortino, alpha, beta, maxDrawdown, volatility, concentrationHHI };
}
