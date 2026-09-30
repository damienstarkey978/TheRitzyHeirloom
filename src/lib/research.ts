export type ResearchLink = { title: string; url: string };

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
};

function emptyResearch(note: string, provider = ""): ResearchResult {
  return {
    configured: false,
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
  };
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

export async function researchPiece(input: {
  title: string;
  notes: string;
  imageBase64?: string;
}): Promise<ResearchResult> {
  const provider = (process.env.AI_PROVIDER ?? "").trim().toLowerCase();
  const key = (process.env.AI_API_KEY ?? "").trim();
  if (!provider || !key) return emptyResearch("AI lookup is not set up.");
  if (provider !== "openai") return emptyResearch("That AI provider is not set up.", provider);

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
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
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
    if (!response.ok) {
      return { ...emptyResearch("The AI lookup did not respond.", provider), configured: true };
    }
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = payload.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const confidence = clip(parsed.confidence, 20).toLowerCase();
    return {
      configured: true,
      provider,
      maker: clip(parsed.maker, 200),
      style: clip(parsed.style, 200),
      era: clip(parsed.era, 200),
      material: clip(parsed.material, 200),
      history: clip(parsed.history, 2000),
      description: clip(parsed.description, 2000),
      confidence: ["low", "medium", "high"].includes(confidence) ? confidence : "low",
      links: asLinks(parsed.links),
      note: "",
    };
  } catch {
    return { ...emptyResearch("The AI lookup did not respond.", provider), configured: true };
  }
}
