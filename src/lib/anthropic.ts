import { aiMaxImages, aiMaxSearches, aiTimeoutMs } from "./config.ts";

export type AnthropicLink = { title: string; url: string };

export type AnthropicComparable = {
  title: string;
  priceCents: number;
  currency: string;
  kind: "sold" | "asking";
  date: string;
  sourceName: string;
  url: string;
};

export type AnthropicUsage = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  searchCount: number;
  costMicros: number;
};

export type AnthropicDraft = {
  maker: string;
  style: string;
  era: string;
  material: string;
  history: string;
  description: string;
  confidence: string;
  links: AnthropicLink[];
  title: string;
  dimensions: string;
  makerSourced: boolean;
  eraSourced: boolean;
  makerReason: string;
  eraReason: string;
  titleLinks: AnthropicLink[];
  descriptionLinks: AnthropicLink[];
  historyLinks: AnthropicLink[];
  comparables: AnthropicComparable[];
};

export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5-5";

const INPUT_USD_PER_MILLION: Record<string, number> = {
  "claude-sonnet-5-5": 2,
  "claude-sonnet-5": 2,
  "claude-opus-5-5": 4,
  "claude-opus-5": 5,
  "claude-haiku-4-5": 1,
  "claude-haiku-4-5-20251001": 1,
  "claude-fable-5-1": 10,
};

const OUTPUT_USD_PER_MILLION: Record<string, number> = {
  "claude-sonnet-5-5": 10,
  "claude-sonnet-5": 10,
  "claude-opus-5-5": 20,
  "claude-opus-5": 25,
  "claude-haiku-4-5": 5,
  "claude-haiku-4-5-20251001": 5,
  "claude-fable-5-1": 50,
};

const SEARCH_USD = 0.01;

export function anthropicModel() {
  return (process.env.AI_MODEL ?? "").trim() || DEFAULT_ANTHROPIC_MODEL;
}

export function approximateCostMicros(input: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  searchCount: number;
}) {
  const model = input.model.trim();
  const inputRate = INPUT_USD_PER_MILLION[model] ?? INPUT_USD_PER_MILLION[DEFAULT_ANTHROPIC_MODEL];
  const outputRate = OUTPUT_USD_PER_MILLION[model] ?? OUTPUT_USD_PER_MILLION[DEFAULT_ANTHROPIC_MODEL];
  const dollars =
    (Math.max(0, input.inputTokens) / 1_000_000) * inputRate +
    (Math.max(0, input.outputTokens) / 1_000_000) * outputRate +
    Math.max(0, input.searchCount) * SEARCH_USD;
  return Math.round(dollars * 1_000_000);
}

function clip(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function httpsLinks(value: unknown, max = 6): AnthropicLink[] {
  if (!Array.isArray(value)) return [];
  const links: AnthropicLink[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as { title?: unknown; url?: unknown };
    const url = clip(record.url, 400);
    if (!/^https:\/\//.test(url)) continue;
    links.push({ title: clip(record.title, 160) || url, url });
    if (links.length >= max) break;
  }
  return links;
}

function dollarsToCents(value: unknown) {
  const amount =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.replace(/[^0-9.]/g, ""))
        : NaN;
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) return null;
  return Math.round(amount * 100);
}

function comparableKind(value: unknown): "sold" | "asking" {
  const kind = clip(value, 40).toLowerCase();
  if (kind.includes("sold") || kind.includes("realiz") || kind.includes("hammer")) return "sold";
  return "asking";
}

export function parseComparables(value: unknown): AnthropicComparable[] {
  if (!Array.isArray(value)) return [];
  const comparables: AnthropicComparable[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const url = clip(record.url, 400);
    const priceCents = dollarsToCents(record.price);
    if (!/^https:\/\//.test(url) || priceCents == null) continue;
    comparables.push({
      title: clip(record.title, 200) || clip(record.source_name, 80) || url,
      priceCents,
      currency: (clip(record.currency, 8) || "USD").toUpperCase(),
      kind: comparableKind(record.kind),
      date: clip(record.date, 40),
      sourceName: clip(record.source_name, 80) || "Web",
      url,
    });
    if (comparables.length >= 12) break;
  }
  return comparables;
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced?.[1] ?? text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

type ContentBlock = {
  type?: string;
  text?: string;
  citations?: Array<{ url?: string; title?: string }>;
};

export function parseAnthropicMessage(payload: {
  content?: ContentBlock[];
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    server_tool_use?: { web_search_requests?: number };
  };
  model?: string;
}, model: string): { research: AnthropicDraft; usage: AnthropicUsage } | null {
  const blocks = payload.content ?? [];
  const text = blocks
    .filter((block) => block.type === "text" && block.text)
    .map((block) => block.text ?? "")
    .join("\n");
  const parsed = extractJson(text);
  if (!parsed) return null;
  const citationLinks = httpsLinks(
    blocks.flatMap((block) => block.citations ?? []).map((citation) => ({
      title: citation.title,
      url: citation.url,
    })),
  );
  const confidence = clip(parsed.confidence, 20).toLowerCase();
  const inputTokens = payload.usage?.input_tokens ?? 0;
  const outputTokens = payload.usage?.output_tokens ?? 0;
  const searchCount = payload.usage?.server_tool_use?.web_search_requests ?? 0;
  const resolvedModel = payload.model || model;
  return {
    research: {
      maker: clip(parsed.maker, 200),
      style: clip(parsed.style, 200),
      era: clip(parsed.era, 200),
      material: clip(parsed.material, 200),
      history: clip(parsed.history, 2000),
      description: clip(parsed.description, 2000),
      confidence: ["low", "medium", "high"].includes(confidence) ? confidence : "low",
      links: citationLinks,
      title: clip(parsed.title, 200),
      dimensions: clip(parsed.dimensions, 200),
      makerSourced: parsed.maker_sourced === true,
      eraSourced: parsed.era_sourced === true,
      makerReason: clip(parsed.maker_reason, 300),
      eraReason: clip(parsed.era_reason, 300),
      titleLinks: httpsLinks(parsed.title_links),
      descriptionLinks: httpsLinks(parsed.description_links),
      historyLinks: httpsLinks(parsed.history_links),
      comparables: parseComparables(parsed.comparables),
    },
    usage: {
      model: resolvedModel,
      inputTokens: Math.max(0, Math.round(inputTokens)),
      outputTokens: Math.max(0, Math.round(outputTokens)),
      searchCount: Math.max(0, Math.round(searchCount)),
      costMicros: approximateCostMicros({
        model: resolvedModel,
        inputTokens,
        outputTokens,
        searchCount,
      }),
    },
  };
}

export function anthropicFailureMessage(status: number, body: string) {
  let type = "";
  let message = "";
  try {
    const parsed = JSON.parse(body) as { error?: { type?: string; message?: string } };
    type = parsed.error?.type ?? "";
    message = parsed.error?.message ?? "";
  } catch {
    message = "";
  }
  if (status === 429 || type === "rate_limit_error") {
    return "The AI lookup is rate limited. Try again in a few minutes.";
  }
  if (status === 402 || type === "billing_error" || /credit balance|out of credit|insufficient credit/i.test(message)) {
    return "The AI lookup is out of credit.";
  }
  if (status === 401 || type === "authentication_error") return "The AI key was rejected.";
  return "The AI lookup did not respond.";
}

function researchPrompt(input: { title: string; notes: string }) {
  return [
    "You help a shop owner price one antique or vintage piece, the way a careful assistant would answer how much it is worth.",
    "Look at the photos and identify the object. Then search the open web before you answer.",
    "Favor auction results and dealer listings such as LiveAuctioneers, Invaluable, 1stDibs, Chairish, Ruby Lane, and WorthPoint-style pages when search can reach them.",
    "Prefer sold or realized prices over asking prices. If a page does not state a price, do not invent one.",
    "State a maker, age, or provenance as fact only when a source URL supports it. Otherwise set the sourced flag to false and give the reason to say possibly.",
    "Reply with one JSON object and no other text. Use these keys:",
    "title, title_links, maker, maker_sourced, maker_reason, style, era, era_sourced, era_reason, material, dimensions, confidence,",
    "description, description_links, history, history_links, comparables.",
    "confidence is low, medium, or high for the identification.",
    "title_links, description_links, and history_links are arrays of {title, url} with https URLs.",
    "comparables is an array of {title, price, currency, kind, date, source_name, url}.",
    "kind is sold for a realized, hammer, or sold price, and asking for an asking price.",
    "price is a number in major units, such as dollars, not cents. url must be https.",
    "Do not include a recommended shop price. The desk calculates that separately.",
    `Title already on the piece: ${input.title.slice(0, 200) || "Untitled"}`,
    `Notes already on the piece: ${input.notes.slice(0, 1500) || "None"}`,
  ].join("\n");
}

export async function requestAnthropicResearch(input: {
  title: string;
  notes: string;
  images: string[];
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}): Promise<{ ok: true; payload: unknown } | { ok: false; status: number; body: string }> {
  const key = (process.env.AI_API_KEY ?? "").trim();
  const model = anthropicModel();
  const images = input.images.slice(0, aiMaxImages());
  const content: Array<Record<string, unknown>> = [{ type: "text", text: researchPrompt(input) }];
  for (const image of images) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data: image },
    });
  }
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 8000,
      output_config: { effort: "medium" },
      tools: [
        {
          type: "web_search_20260318",
          name: "web_search",
          max_uses: aiMaxSearches(),
          user_location: {
            type: "approximate",
            country: "US",
            timezone: "America/New_York",
          },
        },
      ],
      messages: [{ role: "user", content }],
    }),
    signal: input.signal ?? AbortSignal.timeout(aiTimeoutMs()),
  });
  const body = await response.text();
  if (!response.ok) return { ok: false, status: response.status, body: body.slice(0, 500) };
  try {
    return { ok: true, payload: JSON.parse(body) as unknown };
  } catch {
    return { ok: false, status: response.status, body: "" };
  }
}
