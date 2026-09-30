import type { AskingListing } from "./value.ts";

type EbayMoney = { value?: string; currency?: string };
type EbayItem = {
  title?: string;
  itemWebUrl?: string;
  price?: EbayMoney;
  currentBidPrice?: EbayMoney;
};

export function ebayConfigured() {
  return Boolean(process.env.EBAY_CLIENT_ID?.trim() && process.env.EBAY_CLIENT_SECRET?.trim());
}

function moneyToCents(money: EbayMoney | undefined) {
  if (!money?.value) return { cents: null, currency: money?.currency ?? "" };
  const amount = Number(money.value);
  if (!Number.isFinite(amount) || amount < 0) return { cents: null, currency: money.currency ?? "" };
  return { cents: Math.round(amount * 100), currency: money.currency ?? "" };
}

function listingsFrom(items: EbayItem[], source: AskingListing["source"]): AskingListing[] {
  const seen = new Set<string>();
  const listings: AskingListing[] = [];
  for (const item of items) {
    const url = item.itemWebUrl?.trim() ?? "";
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const money = moneyToCents(item.price ?? item.currentBidPrice);
    listings.push({
      title: (item.title ?? "Listing").trim().slice(0, 200),
      url,
      priceCents: money.cents,
      currency: money.currency,
      source,
    });
  }
  return listings;
}

async function appToken() {
  const id = process.env.EBAY_CLIENT_ID?.trim() ?? "";
  const secret = process.env.EBAY_CLIENT_SECRET?.trim() ?? "";
  if (!id || !secret) return null;
  const auth = Buffer.from(`${id}:${secret}`).toString("base64");
  const response = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) return null;
  const json = (await response.json()) as { access_token?: string };
  return json.access_token ?? null;
}

async function browse(token: string, path: string, init?: RequestInit) {
  const response = await fetch(`https://api.ebay.com/buy/browse/v1/item_summary/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) return null;
  const json = (await response.json()) as { itemSummaries?: EbayItem[] };
  return json.itemSummaries ?? [];
}

export async function searchAskingPrices(query: string): Promise<{ listings: AskingListing[]; error: string }> {
  const q = query.trim().slice(0, 100);
  if (!q) return { listings: [], error: "" };
  if (!ebayConfigured()) return { listings: [], error: "eBay is not set up." };
  const token = await appToken();
  if (!token) return { listings: [], error: "eBay did not accept the lookup." };
  const items = await browse(token, `search?q=${encodeURIComponent(q)}&limit=12`);
  if (!items) return { listings: [], error: "eBay did not return asking prices." };
  return { listings: listingsFrom(items, "keyword"), error: "" };
}

export async function searchAskingByImage(jpeg: Buffer): Promise<{ listings: AskingListing[]; error: string }> {
  if (!ebayConfigured()) return { listings: [], error: "eBay is not set up." };
  if (jpeg.length === 0) return { listings: [], error: "" };
  const token = await appToken();
  if (!token) return { listings: [], error: "eBay did not accept the photo lookup." };
  const items = await browse(token, "search_by_image?limit=12", {
    method: "POST",
    body: JSON.stringify({ image: jpeg.toString("base64") }),
  });
  if (!items) return { listings: [], error: "eBay did not match the photo." };
  return { listings: listingsFrom(items, "image"), error: "" };
}
