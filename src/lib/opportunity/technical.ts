import { ADX, ATR, BollingerBands, EMA, MACD, RSI, SMA } from "trading-signals";

import type { PriceHistory, TechnicalSnapshot } from "@/types/opportunity";

const MIN_BARS = 30;

type Trend = TechnicalSnapshot["trend"];

function lastFinite(values: readonly (number | null | undefined)[]): number | null {
  for (let i = values.length - 1; i >= 0; i--) {
    const v = values[i];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

function safeNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

function runNumberSeries(
  ctor: RSI | SMA | EMA,
  closes: number[],
): number | null {
  const results = ctor.updates(closes, false);
  return lastFinite(results.map((r) => (typeof r === "number" ? r : null)));
}

function periodReturn(closes: number[], offset: number): number | null {
  if (closes.length <= offset) return null;
  const last = closes[closes.length - 1];
  const past = closes[closes.length - 1 - offset];
  if (!Number.isFinite(last) || !Number.isFinite(past) || past <= 0) return null;
  return last / past - 1;
}

function classifyTrend(params: {
  price: number;
  sma50: number | null;
  sma200: number | null;
  adx: number | null;
}): Trend {
  const { price, sma50, sma200, adx } = params;
  if (sma50 == null || sma200 == null) return "neutral";
  const goldenCross = sma50 > sma200;
  const deathCross = sma50 < sma200;
  const strongAdx = adx != null && adx > 25;
  if (goldenCross && price > sma200 && strongAdx) return "strong-up";
  if (goldenCross && price > sma50) return "up";
  if (deathCross && price < sma200 && strongAdx) return "strong-down";
  if (deathCross && price < sma50) return "down";
  return "neutral";
}

function clamp(n: number, lo: number, hi: number): number {
  if (n < lo) return lo;
  if (n > hi) return hi;
  return n;
}

function momentumScore(params: {
  rsi: number | null;
  macdHistogram: number | null;
  price: number;
  sma200: number | null;
}): number {
  let score = 50;

  // RSI contribution: sweet spot 50-70 gets full points, penalize extremes
  if (params.rsi != null) {
    const rsi = params.rsi;
    const distanceFromIdeal = Math.abs(rsi - 60);
    const rsiPoints = clamp(40 * (1 - distanceFromIdeal / 60), -20, 40);
    score += rsiPoints - 20; // shift baseline so neutral RSI is neutral score
  }

  // MACD histogram: scale by price for normalization
  if (params.macdHistogram != null && params.price > 0) {
    const normalizedHist = params.macdHistogram / params.price;
    const macdPoints = clamp(normalizedHist * 3500, -35, 35);
    score += macdPoints;
  }

  // Price vs SMA200
  if (params.sma200 != null && params.sma200 > 0) {
    const priceRatio = params.price / params.sma200 - 1;
    const priceDeviation = clamp(priceRatio / 0.1, -1, 1);
    score += priceDeviation * 25;
  }

  return Math.round(clamp(score, 0, 100));
}

function toDailyReturns(closes: readonly number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const prev = closes[i - 1];
    const curr = closes[i];
    if (Number.isFinite(prev) && Number.isFinite(curr) && prev > 0) {
      out.push(curr / prev - 1);
    } else {
      out.push(NaN);
    }
  }
  return out;
}

function computeBeta(stockCloses: readonly number[], marketCloses: readonly number[] | null | undefined): number | null {
  if (!marketCloses || marketCloses.length < MIN_BARS || stockCloses.length < MIN_BARS) return null;
  const stockReturns = toDailyReturns(stockCloses);
  const marketReturns = toDailyReturns(marketCloses);
  const n = Math.min(stockReturns.length, marketReturns.length);
  if (n < MIN_BARS - 1) return null;
  const s = stockReturns.slice(stockReturns.length - n);
  const m = marketReturns.slice(marketReturns.length - n);
  let count = 0;
  let sumS = 0;
  let sumM = 0;
  for (let i = 0; i < n; i++) {
    if (Number.isFinite(s[i]) && Number.isFinite(m[i])) {
      sumS += s[i];
      sumM += m[i];
      count++;
    }
  }
  if (count < MIN_BARS - 1) return null;
  const meanS = sumS / count;
  const meanM = sumM / count;
  let cov = 0;
  let varM = 0;
  for (let i = 0; i < n; i++) {
    if (Number.isFinite(s[i]) && Number.isFinite(m[i])) {
      const ds = s[i] - meanS;
      const dm = m[i] - meanM;
      cov += ds * dm;
      varM += dm * dm;
    }
  }
  if (varM <= 0) return null;
  const beta = cov / varM;
  if (!Number.isFinite(beta)) return null;
  return Math.round(beta * 100) / 100;
}

export function computeTechnical(history: PriceHistory, marketCloses?: readonly number[] | null): TechnicalSnapshot | null {
  const { closes, highs, lows, volumes } = history;
  if (!closes || closes.length < MIN_BARS) return null;

  const n = closes.length;
  const price = closes[n - 1];
  if (!Number.isFinite(price) || price <= 0) return null;

  // Simple moving averages / EMAs / RSI via .updates()
  const rsi = runNumberSeries(new RSI(14), closes);
  const sma20 = runNumberSeries(new SMA(20), closes);
  const sma50 = runNumberSeries(new SMA(50), closes);
  const sma200 = runNumberSeries(new SMA(200), closes);
  const ema20 = runNumberSeries(new EMA(20), closes);
  const ema50 = runNumberSeries(new EMA(50), closes);
  const ema200 = runNumberSeries(new EMA(200), closes);

  // MACD (12, 26, 9)
  let macdValue: number | null = null;
  let macdSignal: number | null = null;
  let macdHistogram: number | null = null;
  try {
    const macdIndicator = new MACD(new EMA(12), new EMA(26), new EMA(9));
    const macdResults = macdIndicator.updates(closes, false);
    for (let i = macdResults.length - 1; i >= 0; i--) {
      const r = macdResults[i];
      if (r) {
        macdValue = safeNumber(r.macd);
        macdSignal = safeNumber(r.signal);
        macdHistogram = safeNumber(r.histogram);
        break;
      }
    }
  } catch {
    // swallow — indicator warm-up failed
  }

  // Bollinger Bands (20, 2)
  let bollingerLower: number | null = null;
  let bollingerUpper: number | null = null;
  try {
    const bb = new BollingerBands(20, 2);
    const bbResults = bb.updates(closes, false);
    for (let i = bbResults.length - 1; i >= 0; i--) {
      const r = bbResults[i];
      if (r) {
        bollingerLower = safeNumber(r.lower);
        bollingerUpper = safeNumber(r.upper);
        break;
      }
    }
  } catch {
    // ignore
  }

  // ATR (14) & ADX (14) — need OHLC bars
  let atrValue: number | null = null;
  let adxValue: number | null = null;
  try {
    const atr = new ATR(14);
    for (let i = 0; i < n; i++) {
      const h = highs[i];
      const l = lows[i];
      const c = closes[i];
      if (!Number.isFinite(h) || !Number.isFinite(l) || !Number.isFinite(c)) continue;
      atr.add({ high: h, low: l, close: c });
    }
    atrValue = safeNumber(atr.getResult());
  } catch {
    // ignore
  }
  try {
    const adx = new ADX(14);
    for (let i = 0; i < n; i++) {
      const h = highs[i];
      const l = lows[i];
      const c = closes[i];
      if (!Number.isFinite(h) || !Number.isFinite(l) || !Number.isFinite(c)) continue;
      adx.add({ high: h, low: l, close: c });
    }
    const adxResult = adx.getResult();
    if (adxResult != null) {
      // trading-signals ADX returns a number-like value
      const asNum =
        typeof adxResult === "number"
          ? adxResult
          : safeNumber((adxResult as { adx?: number }).adx);
      adxValue = asNum;
    }
  } catch {
    // ignore
  }

  // Pivot support / resistance using latest bar
  const lastHigh = highs[n - 1];
  const lastLow = lows[n - 1];
  const lastClose = closes[n - 1];
  let support: number | null = null;
  let resistance: number | null = null;
  if (
    Number.isFinite(lastHigh) &&
    Number.isFinite(lastLow) &&
    Number.isFinite(lastClose)
  ) {
    const pivot = (lastHigh + lastLow + lastClose) / 3;
    resistance = 2 * pivot - lastLow;
    support = 2 * pivot - lastHigh;
  }

  // 52-week high/low (approx 252 trading days)
  const lookback = Math.min(252, n);
  const closesWindow = closes.slice(n - lookback);
  const highsWindow = highs.slice(n - lookback);
  const lowsWindow = lows.slice(n - lookback);
  const high52w =
    highsWindow.length > 0
      ? Math.max(...highsWindow.filter((v) => Number.isFinite(v)))
      : null;
  const low52w =
    lowsWindow.length > 0
      ? Math.min(...lowsWindow.filter((v) => Number.isFinite(v) && v > 0))
      : null;

  // Voids in case reduce failed
  const high52wFinal = high52w != null && Number.isFinite(high52w) ? high52w : null;
  const low52wFinal = low52w != null && Number.isFinite(low52w) ? low52w : null;

  // Period returns
  const return1m = periodReturn(closesWindow, 21);
  const return3m = periodReturn(closes, 63);
  const return6m = periodReturn(closes, 126);
  const return1y = periodReturn(closes, 252);

  // Volume / relative volume
  const latestVolume = safeNumber(volumes?.[n - 1]);
  const volumeWindow = (volumes ?? []).slice(Math.max(0, n - 20));
  const finiteVolumes = volumeWindow.filter((v) => Number.isFinite(v));
  const avgVolume =
    finiteVolumes.length > 0
      ? finiteVolumes.reduce((sum, v) => sum + v, 0) / finiteVolumes.length
      : null;
  const relativeVolume =
    latestVolume != null && avgVolume != null && avgVolume > 0
      ? latestVolume / avgVolume
      : null;

  const trend = classifyTrend({ price, sma50, sma200, adx: adxValue });
  const momentum = momentumScore({
    rsi,
    macdHistogram,
    price,
    sma200,
  });

  return {
    price,
    rsi,
    macd: macdValue,
    macdSignal,
    macdHistogram,
    sma20,
    sma50,
    sma200,
    ema20,
    ema50,
    ema200,
    bollingerLower,
    bollingerUpper,
    atr: atrValue,
    adx: adxValue,
    volume: latestVolume,
    avgVolume,
    relativeVolume,
    support,
    resistance,
    high52w: high52wFinal,
    low52w: low52wFinal,
    return1m,
    return3m,
    return6m,
    return1y,
    momentumScore: momentum,
    trend,
    beta: computeBeta(closes, marketCloses ?? null),
  };
}
