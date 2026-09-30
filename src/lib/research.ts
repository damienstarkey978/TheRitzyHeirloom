import {
  anthropicFailureMessage,
  anthropicModel,
  parseAnthropicMessage,
  requestAnthropicResearch,
} from "./anthropic.ts";
import { aiLookupDailyLimit } from "./config.ts";
import type { CombinedEstimate } from "./estimate.ts";

export type ResearchLink = { title: string; url: string };

export type WebComparable = {
  title: string;
  priceCents: number;
  currency: string;
  kind: "sold" | "asking";
  date: string;
  sourceName: string;
  url: string;
};

export type LookupUsage = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  searchCount: number;
  costMicros: number;
};

export type ResearchResult = {
  configured: boolean;
  provider: string;
  maker: string;
  style: string;
  era: string;
  material: string;
  history: string;
  description: string;
  confidence: string;
  links: ResearchLink[];
  note: string;
  called?: boolean;
  title?: string;
  dimensions?: string;
  makerSourced?: boolean;
  eraSourced?: boolean;
  makerReason?: string;
  eraReason?: string;
  titleLinks?: ResearchLink[];
  descriptionLinks?: ResearchLink[];
  historyLinks?: ResearchLink[];
  comparables?: WebComparable[];
  usage?: LookupUsage | null;
  estimate?: CombinedEstimate | null;
};

export function blankResearch(note = "", provider = "", configured = false): ResearchResult {
  return {
    configured,
    provider,
    maker: "",
    style: "",
    era: "",
    material: "",
    history: "",
    description: "",
    confidence: "",
    links: [],
    note,
    called: false,
    title: "",
    dimensions: "",
    makerSourced: false,
    eraSourced: false,
    makerReason: "",
    eraReason: "",
    titleLinks: [],
    descriptionLinks: [],
    historyLinks: [],
    comparables: [],
    usage: null,
    estimate: null,
  };
}

export function normalizeResearch(value: Partial<ResearchResult> | null | undefined): ResearchResult {
  const blank = blankResearch();
  if (!value) return blank;
  return {
    ...blank,
    ...value,
    links: Array.isArray(value.links) ? value.links : [],
    titleLinks: Array.isArray(value.titleLinks) ? value.titleLinks : [],
    descriptionLinks: Array.isArray(value.descriptionLinks) ? value.descriptionLinks : [],
    historyLinks: Array.isArray(value.historyLinks) ? value.historyLinks : [],
    comparables: Array.isArray(value.comparables) ? value.comparables : [],
    usage: value.usage ?? null,
  };
}

export function dailyLookupMessage(limit = aiLookupDailyLimit()) {
  return `This desk has used today's ${limit} lookups. Try again tomorrow.`;
}

export function aiConfigured() {
  return Boolean((process.env.AI_PROVIDER ?? "").trim() && (process.env.AI_API_KEY ?? "").trim());
}

function clip(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function asLinks(value: unknown): ResearchLink[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as { title?: unknown; url?: unknown };
      const url = clip(record.url, 400);
      if (!/^https:\/\//.test(url)) return null;
      return { title: clip(record.title, 160) || url, url };
    })
    .filter((item): item is ResearchLink => item !== null)
    .slice(0, 6);
}

async function researchWithOpenAI(input: {
  title: string;
  notes: string;
  imageBase64?: string;
  provider: string;
  key: string;
  fetchImpl: typeof fetch;
}): Promise<ResearchResult> {
  const prompt = [
    "You research antiques and decorative pieces for a shop desk.",
    "Use the title, notes, and photo. Do not invent a maker, date, or sale price.",
    "If you are unsure, leave the field blank and say so in confidence.",
    "Return JSON only with keys: maker, style, era, material, history, description, confidence, links.",
    "links is an array of {title, url} using https URLs you actually relied on.",
    "confidence is low, medium, or high.",
    `Title: ${input.title.slice(0, 200)}`,
    `Notes: ${input.notes.slice(0, 1500)}`,
  ].join("\n");
  const content: Array<Record<string, unknown>> = [{ type: "text", text: prompt }];
  if (input.imageBase64) {
    content.push({
      type: "image_url",
      image_url: { url: `data:image/jpeg;base64,${input.imageBase64}` },
    });
  }
  try {
    const response = await input.fetchImpl("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: (process.env.AI_MODEL ?? "gpt-4o-mini").trim() || "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content }],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) return { ...blankResearch("The AI lookup did not respond.", input.provider, true), called: true };
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = payload.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const confidence = clip(parsed.confidence, 20).toLowerCase();
    return {
      ...blankResearch("", input.provider, true),
      called: true,
      maker: clip(parsed.maker, 200),
      style: clip(parsed.style, 200),
      era: clip(parsed.era, 200),
      material: clip(parsed.material, 200),
      history: clip(parsed.history, 2000),
      description: clip(parsed.description, 2000),
      confidence: ["low", "medium", "high"].includes(confidence) ? confidence : "low",
      links: asLinks(parsed.links),
    };
  } catch {
    return { ...blankResearch("The AI lookup did not respond.", input.provider, true), called: true };
  }
}

async function researchWithAnthropic(input: {
  title: string;
  notes: string;
  images: string[];
  provider: string;
  fetchImpl: typeof fetch;
}): Promise<ResearchResult> {
  try {
    const result = await requestAnthropicResearch({
      title: input.title,
      notes: input.notes,
      images: input.images,
      fetchImpl: input.fetchImpl,
    });
    if (!result.ok) {
      return {
        ...blankResearch(anthropicFailureMessage(result.status, result.body), input.provider, true),
        called: true,
      };
    }
    const parsed = parseAnthropicMessage(
      result.payload as Parameters<typeof parseAnthropicMessage>[0],
      anthropicModel(),
    );
    if (!parsed) {
      return {
        ...blankResearch("The AI lookup answered, but not in a form the desk could read.", input.provider, true),
        called: true,
      };
    }
    return {
      ...blankResearch("", input.provider, true),
      ...parsed.research,
      called: true,
      usage: parsed.usage,
    };
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return {
      ...blankResearch(timedOut ? "The AI lookup timed out." : "The AI lookup did not respond.", input.provider, true),
      called: true,
    };
  }
}

export async function researchPiece(
  input: {
    title: string;
    notes: string;
    imageBase64?: string;
    images?: string[];
    lookupsToday?: number;
  },
  deps?: { fetch?: typeof fetch },
): Promise<ResearchResult> {
  const provider = (process.env.AI_PROVIDER ?? "").trim().toLowerCase();
  const key = (process.env.AI_API_KEY ?? "").trim();
  if (!provider || !key) return blankResearch("AI lookup is not set up.");
  const limit = aiLookupDailyLimit();
  if ((input.lookupsToday ?? 0) >= limit) {
    return { ...blankResearch(dailyLookupMessage(limit), provider, true), called: false };
  }
  const fetchImpl = deps?.fetch ?? fetch;
  const images = (input.images?.length ? input.images : input.imageBase64 ? [input.imageBase64] : []).filter(Boolean);
  if (provider === "openai") {
    return researchWithOpenAI({
      title: input.title,
      notes: input.notes,
      imageBase64: images[0],
      provider,
      key,
      fetchImpl,
    });
  }
  if (provider !== "anthropic") return blankResearch("That AI provider is not set up.", provider);
  return researchWithAnthropic({
    title: input.title,
    notes: input.notes,
    images,
    provider,
    fetchImpl,
  });
}
