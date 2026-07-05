import type { Fundamentals, ValuationBreakdown, ValuationStatus } from "@/types/opportunity";

const DISCOUNT_RATE = 0.12;
const TERMINAL_GROWTH = 0.04;
const DCF_YEARS = 5;
const UNDERVALUED_THRESHOLD = 0.15;
const OVERVALUED_THRESHOLD = -0.15;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function isFiniteNumber(n: number | null | undefined): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function computePeBased(f: Fundamentals): number | null {
  if (!isFiniteNumber(f.eps) || f.eps <= 0) return null;
  const multiple =
    isFiniteNumber(f.historicalPe) && f.historicalPe > 0
      ? f.historicalPe
      : isFiniteNumber(f.sectorAvgPe) && f.sectorAvgPe > 0
        ? f.sectorAvgPe
        : 20;
  return f.eps * multiple;
}

function computePbBased(f: Fundamentals): number | null {
  if (!isFiniteNumber(f.bookValue) || f.bookValue <= 0) return null;
  const multiple =
    isFiniteNumber(f.historicalPb) && f.historicalPb > 0 ? f.historicalPb : 3;
  return f.bookValue * multiple;
}

function computeDcf(f: Fundamentals): number | null {
  if (!isFiniteNumber(f.eps) || f.eps <= 0) return null;
  const rawGrowth = isFiniteNumber(f.profitGrowth) ? f.profitGrowth : 0.08;
  const growthRate = clamp(rawGrowth, 0, 0.25);
  let pv = 0;
  let projectedEps = f.eps;
  for (let year = 1; year <= DCF_YEARS; year++) {
    projectedEps = projectedEps * (1 + growthRate);
    pv += projectedEps / Math.pow(1 + DISCOUNT_RATE, year);
  }
  const terminalValue =
    (projectedEps * (1 + TERMINAL_GROWTH)) / (DISCOUNT_RATE - TERMINAL_GROWTH);
  pv += terminalValue / Math.pow(1 + DISCOUNT_RATE, DCF_YEARS);
  return pv;
}

function average(values: (number | null)[]): number | null {
  const finite = values.filter(
    (v): v is number => isFiniteNumber(v) && v > 0,
  );
  if (finite.length === 0) return null;
  const sum = finite.reduce((acc, v) => acc + v, 0);
  return sum / finite.length;
}

function classifyStatus(discountPercent: number | null): ValuationStatus {
  if (discountPercent == null) return "fair";
  if (discountPercent > UNDERVALUED_THRESHOLD) return "undervalued";
  if (discountPercent < OVERVALUED_THRESHOLD) return "overvalued";
  return "fair";
}

function buildReasons(params: {
  price: number;
  fundamentals: Fundamentals | null;
  peBased: number | null;
  pbBased: number | null;
  dcfValue: number | null;
  fairValue: number | null;
  discountPercent: number | null;
  status: ValuationStatus;
}): string[] {
  const reasons: string[] = [];
  const { price, fundamentals, peBased, pbBased, dcfValue, fairValue, discountPercent, status } = params;

  if (!fundamentals) {
    reasons.push("Fundamentals unavailable — valuation is a rough estimate.");
    return reasons;
  }

  if (fairValue != null && discountPercent != null) {
    const pct = Math.abs(discountPercent * 100);
    if (status === "undervalued") {
      reasons.push(
        `Trading ~${pct.toFixed(0)}% below estimated fair value of ₹${fairValue.toFixed(0)}.`,
      );
    } else if (status === "overvalued") {
      reasons.push(
        `Trading ~${pct.toFixed(0)}% above estimated fair value of ₹${fairValue.toFixed(0)}.`,
      );
    } else {
      reasons.push(
        `Price is close to estimated fair value of ₹${fairValue.toFixed(0)}.`,
      );
    }
  }

  if (peBased != null) {
    const peGap = ((peBased - price) / peBased) * 100;
    if (Math.abs(peGap) > 10) {
      reasons.push(
        `PE-based fair value ₹${peBased.toFixed(0)} vs current ₹${price.toFixed(0)} (${peGap >= 0 ? "+" : ""}${peGap.toFixed(0)}%).`,
      );
    }
  }

  if (pbBased != null) {
    const pbGap = ((pbBased - price) / pbBased) * 100;
    if (Math.abs(pbGap) > 10) {
      reasons.push(
        `PB-based fair value ₹${pbBased.toFixed(0)} (${pbGap >= 0 ? "+" : ""}${pbGap.toFixed(0)}%).`,
      );
    }
  }

  if (dcfValue != null) {
    const dcfGap = ((dcfValue - price) / dcfValue) * 100;
    reasons.push(
      `5-yr DCF estimate ₹${dcfValue.toFixed(0)} (${dcfGap >= 0 ? "+" : ""}${dcfGap.toFixed(0)}% vs price).`,
    );
  }

  if (isFiniteNumber(fundamentals.pe) && fundamentals.pe > 0) {
    if (isFiniteNumber(fundamentals.sectorAvgPe) && fundamentals.sectorAvgPe > 0) {
      const sectorGap = ((fundamentals.pe - fundamentals.sectorAvgPe) / fundamentals.sectorAvgPe) * 100;
      if (Math.abs(sectorGap) > 10) {
        reasons.push(
          sectorGap > 0
            ? `PE (${fundamentals.pe.toFixed(1)}) trades at ${sectorGap.toFixed(0)}% premium to sector avg.`
            : `PE (${fundamentals.pe.toFixed(1)}) trades at ${Math.abs(sectorGap).toFixed(0)}% discount to sector avg.`,
        );
      }
    } else if (isFiniteNumber(fundamentals.historicalPe) && fundamentals.historicalPe > 0) {
      const histGap = ((fundamentals.pe - fundamentals.historicalPe) / fundamentals.historicalPe) * 100;
      if (Math.abs(histGap) > 10) {
        reasons.push(
          histGap > 0
            ? `PE (${fundamentals.pe.toFixed(1)}) is ${histGap.toFixed(0)}% above 5-yr average.`
            : `PE (${fundamentals.pe.toFixed(1)}) is ${Math.abs(histGap).toFixed(0)}% below 5-yr average.`,
        );
      }
    }
  }

  return reasons;
}

export function computeValuation(
  price: number,
  fundamentals: Fundamentals | null,
): ValuationBreakdown {
  const safePrice = isFiniteNumber(price) && price > 0 ? price : 0;

  if (!fundamentals) {
    return {
      status: "fair",
      fairValue: null,
      discountPercent: null,
      dcfValue: null,
      peBased: null,
      pbBased: null,
      reasons: ["Fundamentals unavailable — valuation cannot be computed."],
    };
  }

  const peBased = computePeBased(fundamentals);
  const pbBased = computePbBased(fundamentals);
  const dcfValue = computeDcf(fundamentals);
  const fairValue = average([peBased, pbBased, dcfValue]);

  const discountPercent =
    fairValue != null && safePrice > 0 ? (fairValue - safePrice) / fairValue : null;
  const status = classifyStatus(discountPercent);
  const reasons = buildReasons({
    price: safePrice,
    fundamentals,
    peBased,
    pbBased,
    dcfValue,
    fairValue,
    discountPercent,
    status,
  });

  return {
    status,
    fairValue,
    discountPercent,
    dcfValue,
    peBased,
    pbBased,
    reasons,
  };
}
