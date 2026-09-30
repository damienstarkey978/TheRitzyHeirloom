import { safeEqual } from "./security.ts";

export type InventoryRow = {
  sku: string;
  barcode: string;
  title: string;
  category: string;
  maker: string;
  material: string;
  era: string;
  dimensions: string;
  condition: string;
  tags: string;
  cost_cents: number | null;
  price_cents: number | null;
  ask_for_price: boolean;
  quantity: number;
  status: string;
  location: string;
  created_at: string;
  updated_at: string;
};

export function posAuthorized(header: string | null, expected: string): "ok" | "unset" | "denied" {
  const token = expected.trim();
  if (!token) return "unset";
  const presented = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  if (!presented || !safeEqual(presented, token)) return "denied";
  return "ok";
}

function cell(value: string | number | boolean | null) {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

export const INVENTORY_COLUMNS = [
  "sku",
  "barcode",
  "title",
  "category",
  "maker",
  "material",
  "era",
  "dimensions",
  "condition",
  "tags",
  "cost_cents",
  "price_cents",
  "ask_for_price",
  "quantity",
  "status",
  "location",
  "created_at",
  "updated_at",
] as const;

export function inventoryCsv(rows: InventoryRow[]) {
  const lines = [INVENTORY_COLUMNS.join(",")];
  for (const row of rows) {
    lines.push(INVENTORY_COLUMNS.map((column) => cell(row[column])).join(","));
  }
  return `${lines.join("\n")}\n`;
}
