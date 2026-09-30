export const WEB_ASKING_FACTOR = 0.7;
export const EBAY_ASKING_FACTOR = 0.55;
const SOLD_WEIGHT = 1;
const WEB_WEIGHT = 0.6;
const EBAY_WEIGHT = 0.35;

export type EstimateConfidence = "low" | "medium" | "high";

export type CombinedEstimate = {
  low: number;
  typical: number;
  high: number;
  soldCount: number;
  webAskingCount: number;
  ebayAskingCount: number;
  usedSold: number;
  usedWebAsking: number;
  usedEbay: number;
  confidence: EstimateConfidence;
  few: boolean;
  method: string;
};

type Weighted = { cents: number; weight: number; kind: "sold" | "web" | "ebay" };

function usable(cents: number[]) {
  return cents.filter((value) => Number.isInteger(value) && value > 0);
}

function quantile(sorted: number[], portion: number) {
  if (sorted.length === 1) return sorted[0];
  const index = (sorted.length - 1) * portion;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  return Math.round(sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower));
}

function dropOutliers(values: Weighted[]) {
  if (values.length < 4) return values;
  const sorted = [...values].sort((a, b) => a.cents - b.cents);
  const prices = sorted.map((item) => item.cents);
  const median = quantile(prices, 0.5);
  if (median <= 0) return values;
  const kept = sorted.filter((item) => item.cents >= median / 4 && item.cents <= median * 4);
  return kept.length >= 2 ? kept : values;
}

function expand(values: Weighted[]) {
  const expanded: number[] = [];
  for (const item of [...values].sort((a, b) => a.cents - b.cents)) {
    const copies = Math.max(1, Math.round(item.weight * 20));
    for (let index = 0; index < copies; index += 1) expanded.push(item.cents);
  }
  return expanded;
}

function countPhrase(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function methodLine(estimate: Omit<CombinedEstimate, "method" | "low" | "typical" | "high" | "confidence" | "few"> & {
  few: boolean;
}) {
  const used: string[] = [];
  if (estimate.usedSold) used.push(countPhrase(estimate.usedSold, "sold price", "sold prices"));
  if (estimate.usedWebAsking) {
    used.push(
      `${countPhrase(estimate.usedWebAsking, "web asking price", "web asking prices")}, counted at 70%`,
    );
  }
  if (estimate.usedEbay) {
    used.push(
      `${countPhrase(estimate.usedEbay, "eBay asking price", "eBay asking prices")}, counted at 55% with a lower weight`,
    );
  }
  const leftOut: string[] = [];
  const unusedSold = estimate.soldCount - estimate.usedSold;
  const unusedWeb = estimate.webAskingCount - estimate.usedWebAsking;
  const unusedEbay = estimate.ebayAskingCount - estimate.usedEbay;
  if (unusedSold > 0) leftOut.push(countPhrase(unusedSold, "sold price", "sold prices"));
  if (unusedWeb > 0) leftOut.push(countPhrase(unusedWeb, "web asking price", "web asking prices"));
  if (unusedEbay > 0) leftOut.push(countPhrase(unusedEbay, "eBay asking price", "eBay asking prices"));
  let line = `Typical blends ${used.join("; ")}.`;
  if (leftOut.length > 0) {
    line += ` Left out ${leftOut.join(" and ")} because closer sale prices were enough.`;
  }
  if (estimate.few) line += " Few comparables, so this is a rough estimate.";
  return line;
}

export function combineEstimates(input: {
  sold?: number[];
  webAsking?: number[];
  ebayAsking?: number[];
}): CombinedEstimate | null {
  const sold = usable(input.sold ?? []);
  const webAsking = usable(input.webAsking ?? []);
  const ebayAsking = usable(input.ebayAsking ?? []);
  if (sold.length + webAsking.length + ebayAsking.length === 0) return null;

  let pool: Weighted[];
  if (sold.length >= 3) {
    pool = sold.map((cents) => ({ cents, weight: SOLD_WEIGHT, kind: "sold" as const }));
  } else if (sold.length + webAsking.length > 0) {
    pool = [
      ...sold.map((cents) => ({ cents, weight: SOLD_WEIGHT, kind: "sold" as const })),
      ...webAsking.map((cents) => ({
        cents: Math.round(cents * WEB_ASKING_FACTOR),
        weight: WEB_WEIGHT,
        kind: "web" as const,
      })),
    ];
    if (pool.length < 3) {
      pool.push(
        ...ebayAsking.map((cents) => ({
          cents: Math.round(cents * EBAY_ASKING_FACTOR),
          weight: EBAY_WEIGHT,
          kind: "ebay" as const,
        })),
      );
    }
  } else {
    pool = ebayAsking.map((cents) => ({
      cents: Math.round(cents * EBAY_ASKING_FACTOR),
      weight: EBAY_WEIGHT,
      kind: "ebay" as const,
    }));
  }

  const kept = dropOutliers(pool);
  const expanded = expand(kept);
  const usedSold = kept.filter((item) => item.kind === "sold").length;
  const usedWebAsking = kept.filter((item) => item.kind === "web").length;
  const usedEbay = kept.filter((item) => item.kind === "ebay").length;
  const used = usedSold + usedWebAsking + usedEbay;
  const few = used < 3;
  const confidence: EstimateConfidence =
    usedSold >= 4 ? "high" : usedSold + usedWebAsking >= 3 ? "medium" : "low";
  const summary = {
    soldCount: sold.length,
    webAskingCount: webAsking.length,
    ebayAskingCount: ebayAsking.length,
    usedSold,
    usedWebAsking,
    usedEbay,
    few,
  };
  return {
    low: quantile(expanded, 0.25),
    typical: quantile(expanded, 0.5),
    high: quantile(expanded, 0.75),
    confidence,
    ...summary,
    method: methodLine(summary),
  };
}

export function formatCostMicros(micros: number) {
  const safe = Number.isFinite(micros) ? Math.max(0, Math.round(micros)) : 0;
  const dollars = safe / 1_000_000;
  if (dollars === 0) return "$0.00";
  if (dollars < 1) return `$${dollars.toFixed(4)}`;
  return `$${dollars.toFixed(2)}`;
}

export function cautiousClaim(value: string, sourced: boolean | undefined, reason: string | undefined) {
  const text = value.trim();
  if (!text) return "";
  if (sourced !== false) return text;
  const why = reason?.trim() || "no source confirmed it";
  if (/^possibly\b/i.test(text)) return /[.!?]$/.test(text) ? `${text} ${why}` : `${text}. ${why}`;
  return `Possibly ${text}. ${why}`;
}
