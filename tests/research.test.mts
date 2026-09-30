import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { researchPiece } from "../src/lib/research.ts";

describe("research", () => {
  test("an unset provider says the AI lookup is not set up", async () => {
    delete process.env.AI_PROVIDER;
    delete process.env.AI_API_KEY;
    const result = await researchPiece({ title: "Gilt frame", notes: "" });
    assert.equal(result.configured, false);
    assert.equal(result.note, "AI lookup is not set up.");
    assert.equal(result.description, "");
  });
});
