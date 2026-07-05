import { ScreenerClient } from "screener-india";
import type { CompanyData } from "screener-india";
import {
  computeYoyGrowth,
  getLatestValue,
  getRowByName,
  getRowValues,
  getTopRatio,
  parsePercent,
  parseValue,
} from "./screener-parser";
import type { Fundamentals } from "@/types/opportunity";

let clientSingleton: ScreenerClient | null = null;

function getClient(): ScreenerClient {
  if (!clientSingleton) {
    clientSingleton = new ScreenerClient({
      cacheTtlMs: 10 * 60 * 1000,
      minIntervalMs: 200,
      maxRetries: 2,
      timeoutMs: 20000,
    });
  }
  return clientSingleton;
}

/**
 * Fetch Screener.in fundamentals for a single NSE symbol.
 * Tries consolidated financials first (best for holding companies), falls back to standalone.
 * Returns null when both modes fail.
 */
export async function fetchFundamentals(symbol: string): Promise<Fundamentals | null> {
  const client = getClient();
  const warnings: string[] = [];
  let data: CompanyData | null = null;

  try {
    const resp = await client.getCompany(symbol, "consolidated");
    data = resp.data;
    if (resp.warnings?.length) warnings.push(...resp.warnings);
  } catch {
    try {
      const resp = await client.getCompany(symbol, "default");
      data = resp.data;
      if (resp.warnings?.length) warnings.push(...resp.warnings);
    } catch {
      return null;
    }
  }

  if (!data) return null;
  return mapToFundamentals(data, warnings);
}

function mapToFundamentals(data: CompanyData, warnings: string[]): Fundamentals {
  const topRatios = data.topRatios ?? [];

  // Valuation
  const pe = getTopRatio(topRatios, "Stock P/E", "P/E");
  const pb = getTopRatio(topRatios, "Price to Book", "P/B");
  const peg = getTopRatio(topRatios, "PEG");
  const ps = getTopRatio(topRatios, "Price to Sales", "P/S");
  const evEbitda = getTopRatio(topRatios, "EV/EBITDA", "EV / EBITDA");
  const divYield = parsePercent(rawTopRatio(topRatios, "Dividend Yield", "Div Yield"));
  const earningsYield = pe && pe > 0 ? 1 / pe : null;

  // Growth (YoY on annual series from profit-loss table)
  const revenueRow = getRowByName(data.profitLoss, "Sales", "Revenue");
  const revenueSeries = getRowValues(revenueRow, data.profitLoss?.headers ?? []);
  const revenueGrowth = computeYoyGrowth(revenueSeries);

  const profitRow = getRowByName(data.profitLoss, "Net Profit", "Profit");
  const profitSeries = getRowValues(profitRow, data.profitLoss?.headers ?? []);
  const profitGrowth = computeYoyGrowth(profitSeries);

  const epsRow = getRowByName(data.profitLoss, "EPS");
  const epsSeries = getRowValues(epsRow, data.profitLoss?.headers ?? []);
  const epsGrowth = computeYoyGrowth(epsSeries);

  const bookValueRow = getRowByName(data.balanceSheet, "Reserves");
  const bookValueSeries = getRowValues(bookValueRow, data.balanceSheet?.headers ?? []);
  const bookValueGrowth = computeYoyGrowth(bookValueSeries);

  const ocfRow = getRowByName(data.cashFlow, "Cash from Operating Activity", "Operating Activity");
  const ocfSeries = getRowValues(ocfRow, data.cashFlow?.headers ?? []);
  const cashFlowGrowth = computeYoyGrowth(ocfSeries);

  // Quality
  const roe = parsePercent(rawTopRatio(topRatios, "ROE", "Return on Equity"));
  const roce = parsePercent(rawTopRatio(topRatios, "ROCE", "Return on Capital"));
  const roaRow = getRowByName(data.ratios, "Return on Assets", "ROA");
  const roa = parsePercent(rawRowLatest(roaRow, data.ratios?.headers ?? []));
  const opmRow = getRowByName(data.ratios, "OPM", "Operating Profit Margin");
  const opMargin = parsePercent(rawRowLatest(opmRow, data.ratios?.headers ?? []));
  const npmRow = getRowByName(data.ratios, "NPM", "Net Profit Margin");
  const netMargin = parsePercent(rawRowLatest(npmRow, data.ratios?.headers ?? []));

  // Financial Health
  const debtEquity =
    getTopRatio(topRatios, "Debt to equity", "D/E") ??
    getLatestValue(
      getRowByName(data.ratios, "Debt to equity"),
      data.ratios?.headers ?? [],
    );
  const currentRatio =
    getTopRatio(topRatios, "Current Ratio") ??
    getLatestValue(
      getRowByName(data.ratios, "Current Ratio"),
      data.ratios?.headers ?? [],
    );
  const interestCoverage = getLatestValue(
    getRowByName(data.ratios, "Interest Coverage"),
    data.ratios?.headers ?? [],
  );
  const fcf = getLatestValue(ocfRow, data.cashFlow?.headers ?? []);
  const promoterPledge = parsePercent(
    rawRowLatest(
      getRowByName(data.shareholding, "Pledged", "Pledge"),
      data.shareholding?.headers ?? [],
    ),
  );

  // Ownership
  const promoterHolding = parsePercent(
    rawRowLatest(
      getRowByName(data.shareholding, "Promoters", "Promoter"),
      data.shareholding?.headers ?? [],
    ),
  );
  const fiiHolding = parsePercent(
    rawRowLatest(
      getRowByName(data.shareholding, "FIIs", "FII", "Foreign"),
      data.shareholding?.headers ?? [],
    ),
  );
  const diiHolding = parsePercent(
    rawRowLatest(
      getRowByName(data.shareholding, "DIIs", "DII", "Domestic"),
      data.shareholding?.headers ?? [],
    ),
  );
  const publicHolding = parsePercent(
    rawRowLatest(
      getRowByName(data.shareholding, "Public"),
      data.shareholding?.headers ?? [],
    ),
  );

  // Extras
  const eps = getTopRatio(topRatios, "EPS") ?? getLatestValue(epsRow, data.profitLoss?.headers ?? []);
  const bookValue = getTopRatio(topRatios, "Book Value");
  const marketCap = parseMarketCap(rawTopRatio(topRatios, "Market Cap", "Market Capitalization"));

  // Historicals
  const historicalPeRow = getRowByName(data.ratios, "Price to Earning", "PE");
  const historicalPe = averageLastN(getRowValues(historicalPeRow, data.ratios?.headers ?? []), 5);
  const historicalPbRow = getRowByName(data.ratios, "Price to Book");
  const historicalPb = averageLastN(getRowValues(historicalPbRow, data.ratios?.headers ?? []), 5);

  return {
    pe,
    forwardPe: null,
    pb,
    peg,
    ps,
    evEbitda,
    divYield,
    earningsYield,
    revenueGrowth,
    profitGrowth,
    epsGrowth,
    bookValueGrowth,
    cashFlowGrowth,
    roe,
    roce,
    roa,
    opMargin,
    netMargin,
    debtEquity,
    currentRatio,
    interestCoverage,
    fcf,
    promoterPledge,
    promoterHolding,
    fiiHolding,
    diiHolding,
    publicHolding,
    eps,
    bookValue,
    marketCap,
    sectorAvgPe: null,
    historicalPe,
    historicalPb,
    pros: data.analysis?.pros ?? [],
    cons: data.analysis?.cons ?? [],
    description: data.analysis?.description ?? null,
    fetchedAt: Date.now(),
    source: "screener",
    warnings,
  };
}

// ---------- helpers ----------

function rawTopRatio(
  topRatios: CompanyData["topRatios"],
  ...names: string[]
): string | undefined {
  if (!topRatios) return undefined;
  for (const name of names) {
    const needle = name.toLowerCase();
    const hit = topRatios.find((r) => r.name?.toLowerCase().includes(needle));
    if (hit?.value) return hit.value;
  }
  return undefined;
}

function rawRowLatest(
  row: Record<string, string> | null,
  headers: string[],
): string | undefined {
  if (!row || headers.length <= 1) return undefined;
  for (let i = headers.length - 1; i >= 1; i--) {
    const raw = row[headers[i]];
    if (raw && raw.trim()) return raw;
  }
  return undefined;
}

function parseMarketCap(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = parseValue(raw);
  if (n == null) return null;
  const upper = raw.toUpperCase();
  if (upper.includes("CR")) return n * 1e7;
  if (upper.includes("LAKH") || upper.includes("LAC")) return n * 1e5;
  return n;
}

function averageLastN(values: (number | null)[], n: number): number | null {
  const clean = values.filter(
    (v): v is number => v != null && Number.isFinite(v),
  );
  if (clean.length === 0) return null;
  const slice = clean.slice(-n);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}
