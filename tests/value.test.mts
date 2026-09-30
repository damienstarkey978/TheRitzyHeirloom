import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { askingRange, cleanCategory } from "../src/lib/value.ts";

describe("value", () => {
  test("asking prices become a low, typical, and high range", () => {
    assert.equal(askingRange([]), null);
    const range = askingRange([100, 200, 300, 400]);
    assert.deepEqual(range, { low: 175, typical: 250, high: 325, count: 4 });
  });

  test("unknown categories are dropped", () => {
    assert.equal(cleanCategory("Jewelry"), "Jewelry");
    assert.equal(cleanCategory("Not a category"), "");
  });
});
