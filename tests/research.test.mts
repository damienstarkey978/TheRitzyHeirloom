import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { dailyLookupMessage, researchPiece } from "../src/lib/research.ts";

const sample = {
  content: [
    {
      type: "text",
      text: JSON.stringify({
        title: "Gilt wood frame",
        title_links: [{ title: "A frame", url: "https://example.test/frame" }],
        maker: "Unknown workshop",
        maker_sourced: false,
        maker_reason: "no stamp is visible",
        style: "Rococo revival",
        era: "late 19th century",
        era_sourced: true,
        era_reason: "",
        material: "gilt wood",
        dimensions: "about 20 inches",
        confidence: "medium",
        description: "A gilt wood frame with a swept crest.",
        description_links: [{ title: "Dealer", url: "https://example.test/dealer" }],
        history: "Frames of this shape were sold as wall decoration.",
        history_links: [{ title: "Auction", url: "https://example.test/auction" }],
        comparables: [
          {
            title: "Similar frame",
            price: 240,
            currency: "USD",
            kind: "sold",
            date: "2024",
            source_name: "LiveAuctioneers",
            url: "https://example.test/sold",
          },
          {
            title: "Asking frame",
            price: "$480.00",
            currency: "usd",
            kind: "asking",
            date: "",
            source_name: "1stDibs",
            url: "http://example.test/insecure",
          },
        ],
      }),
    },
  ],
  usage: { input_tokens: 1000, output_tokens: 500, server_tool_use: { web_search_requests: 2 } },
  model: "claude-sonnet-5-5",
};

describe("research", { concurrency: 1 }, () => {
  test("an unset provider says the AI lookup is not set up", async () => {
    delete process.env.AI_PROVIDER;
    delete process.env.AI_API_KEY;
    const result = await researchPiece({ title: "Gilt frame", notes: "" });
    assert.equal(result.configured, false);
    assert.equal(result.note, "AI lookup is not set up.");
    assert.equal(result.description, "");
    assert.equal(result.called, false);
  });

  test("anthropic without a key stays unset", async () => {
    process.env.AI_PROVIDER = "anthropic";
    delete process.env.AI_API_KEY;
    const result = await researchPiece({ title: "Gilt frame", notes: "" });
    assert.equal(result.note, "AI lookup is not set up.");
  });

  test("the daily cap does not call Anthropic", async () => {
    process.env.AI_PROVIDER = "anthropic";
    process.env.AI_API_KEY = "test-key";
    process.env.AI_LOOKUP_DAILY_LIMIT = "40";
    let called = false;
    const result = await researchPiece(
      { title: "Gilt frame", notes: "", lookupsToday: 40 },
      {
        fetch: async () => {
          called = true;
          throw new Error("should not be called");
        },
      },
    );
    assert.equal(called, false);
    assert.equal(result.note, dailyLookupMessage(40));
    assert.equal(result.called, false);
  });

  test("a mocked Anthropic reply becomes comparables and a cost", async () => {
    process.env.AI_PROVIDER = "anthropic";
    process.env.AI_API_KEY = "test-key";
    delete process.env.AI_MODEL;
    process.env.AI_LOOKUP_DAILY_LIMIT = "40";
    let request: { url: string; key: string; body: string } | null = null;
    const result = await researchPiece(
      { title: "Gilt frame", notes: "swept crest", images: ["abc"], lookupsToday: 0 },
      {
        fetch: async (url, init) => {
          const headers = new Headers(init?.headers);
          request = {
            url: String(url),
            key: headers.get("x-api-key") ?? "",
            body: String(init?.body ?? ""),
          };
          return new Response(JSON.stringify(sample), { status: 200 });
        },
      },
    );
    assert.ok(request);
    assert.equal(request.url, "https://api.anthropic.com/v1/messages");
    assert.equal(request.key, "test-key");
    assert.equal(request.body.includes("test-key"), false);
    assert.match(request.body, /claude-sonnet-5-5/);
    assert.match(request.body, /web_search_20260318/);
    assert.match(request.body, /"max_uses":5/);
    assert.match(request.body, /abc/);
    assert.equal(result.called, true);
    assert.equal(result.title, "Gilt wood frame");
    assert.equal(result.makerSourced, false);
    assert.equal(result.eraSourced, true);
    assert.equal(result.comparables?.length, 1);
    assert.equal(result.comparables?.[0]?.priceCents, 24000);
    assert.equal(result.comparables?.[0]?.kind, "sold");
    assert.equal(result.usage?.searchCount, 2);
    assert.equal(result.usage?.costMicros, 27_000);
    delete process.env.AI_API_KEY;
  });

  test("rate limit and credit failures stay readable", async () => {
    process.env.AI_PROVIDER = "anthropic";
    process.env.AI_API_KEY = "test-key";
    const limited = await researchPiece(
      { title: "Frame", notes: "" },
      { fetch: async () => new Response(JSON.stringify({ error: { type: "rate_limit_error", message: "slow down" } }), { status: 429 }) },
    );
    assert.equal(limited.note, "The AI lookup is rate limited. Try again in a few minutes.");
    assert.equal(limited.called, true);
    const credit = await researchPiece(
      { title: "Frame", notes: "" },
      {
        fetch: async () =>
          new Response(
            JSON.stringify({
              error: { type: "invalid_request_error", message: "Your credit balance is too low to access the Anthropic API." },
            }),
            { status: 400 },
          ),
      },
    );
    assert.equal(credit.note, "The AI lookup is out of credit.");
    delete process.env.AI_API_KEY;
  });

  test("openai still uses its own endpoint", async () => {
    process.env.AI_PROVIDER = "openai";
    process.env.AI_API_KEY = "test-key";
    let url = "";
    const result = await researchPiece(
      { title: "Frame", notes: "" },
      {
        fetch: async (input) => {
          url = String(input);
          return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ description: "A frame", confidence: "low", links: [] }) } }] }), { status: 200 });
        },
      },
    );
    assert.equal(url, "https://api.openai.com/v1/chat/completions");
    assert.equal(result.description, "A frame");
    assert.equal(result.provider, "openai");
    delete process.env.AI_PROVIDER;
    delete process.env.AI_API_KEY;
  });
});
