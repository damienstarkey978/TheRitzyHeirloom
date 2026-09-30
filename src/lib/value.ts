export const PIECE_CATEGORIES = [
  "Jewelry",
  "Fine art",
  "European and English pieces",
  "French fabrics and wallpapers",
  "Furniture and decorative",
  "Other",
] as const;

export const PIECE_STATUSES = ["draft", "available", "held", "sold"] as const;

export type PieceStatus = (typeof PIECE_STATUSES)[number];
export type PieceCategory = (typeof PIECE_CATEGORIES)[number];

export type AskingListing = {
  title: string;
  url: string;
  priceCents: number | null;
  currency: string;
  source: "keyword" | "image";
};

export type PriceRange = {
  low: number;
  typical: number;
  high: number;
  count: number;
};

export function cleanCategory(value: string): PieceCategory | "" {
  const trimmed = value.trim();
  return (PIECE_CATEGORIES as readonly string[]).includes(trimmed) ? (trimmed as PieceCategory) : "";
}

export function cleanStatus(value: string): PieceStatus | "" {
  const trimmed = value.trim();
  return (PIECE_STATUSES as readonly string[]).includes(trimmed) ? (trimmed as PieceStatus) : "";
}

export function statusLabel(status: string) {
  if (status === "available") return "Available";
  if (status === "held") return "Held";
  if (status === "sold") return "Sold";
  return "Draft";
}

export function askingRange(cents: number[]): PriceRange | null {
  const values = cents.filter((value) => Number.isInteger(value) && value >= 0).sort((a, b) => a - b);
  if (values.length === 0) return null;
  const pick = (portion: number) => {
    const index = (values.length - 1) * portion;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    return Math.round(values[lower] + (values[upper] - values[lower]) * (index - lower));
  };
  return {
    low: pick(0.25),
    typical: pick(0.5),
    high: pick(0.75),
    count: values.length,
  };
}

export function dollars(cents: number) {
  return (cents / 100).toFixed(2);
}
