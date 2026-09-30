import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { cautiousClaim, combineEstimates, formatCostMicros } from "../src/lib/estimate.ts";
import { approximateCostMicros } from "../src/lib/anthropic.ts";
import { shopPeriodStart } from "../src/lib/store.ts";

describe("estimate", () => {
  test("sold prices are used and eBay asking prices are left out", () => {
    const estimate = combineEstimates({
      sold: [10000, 20000, 30000, 40000],
      webAsking: [90000],
      ebayAsking: [10000, 80000],
    });
    assert.ok(estimate);
    assert.equal(estimate.low, 17500);
    assert.equal(estimate.typical, 25000);
    assert.equal(estimate.high, 32500);
    assert.equal(estimate.usedSold, 4);
    assert.equal(estimate.usedWebAsking, 0);
    assert.equal(estimate.usedEbay, 0);
    assert.equal(estimate.confidence, "high");
    assert.equal(estimate.few, false);
    assert.match(estimate.method, /4 sold prices/);
    assert.match(estimate.method, /Left out 1 web asking price and 2 eBay asking prices/);
  });

  test("a price more than four times the median is dropped", () => {
    const estimate = combineEstimates({ sold: [10000, 11000, 12000, 1_000_000] });
    assert.ok(estimate);
    assert.equal(estimate.usedSold, 3);
    assert.equal(estimate.typical, 11000);
    assert.equal(estimate.confidence, "medium");
  });

  test("eBay asking prices are discounted and called out when they are all we have", () => {
    const estimate = combineEstimates({ ebayAsking: [10000, 30000] });
    assert.ok(estimate);
    assert.equal(estimate.typical, 11000);
    assert.equal(estimate.usedEbay, 2);
    assert.equal(estimate.confidence, "low");
    assert.equal(estimate.few, true);
    assert.match(estimate.method, /55%/);
    assert.match(estimate.method, /Few comparables/);
  });

  test("web asking prices are counted at 70 percent before eBay is needed", () => {
    const estimate = combineEstimates({
      sold: [20000],
      webAsking: [10000, 20000],
      ebayAsking: [50000],
    });
    assert.ok(estimate);
    assert.equal(estimate.usedEbay, 0);
    assert.equal(estimate.usedWebAsking, 2);
    assert.equal(estimate.typical, 14000);
    assert.match(estimate.method, /70%/);
  });

  test("an unsourced maker is phrased as a possibility", () => {
    assert.equal(cautiousClaim("Herter Brothers", false, "the stamp is unclear"), "Possibly Herter Brothers. the stamp is unclear");
    assert.equal(cautiousClaim("Herter Brothers", true, ""), "Herter Brothers");
    assert.equal(formatCostMicros(0), "$0.00");
    assert.equal(formatCostMicros(34000), "$0.0340");
  });

  test("Sonnet 5.5 cost includes tokens and web searches", () => {
    assert.equal(
      approximateCostMicros({
        model: "claude-sonnet-5-5",
        inputTokens: 1_000_000,
        outputTokens: 0,
        searchCount: 1,
      }),
      2_010_000,
    );
  });

  test("the desk day follows America/New_York", () => {
    assert.equal(shopPeriodStart("day", new Date("2026-10-01T03:00:00.000Z")), "2026-09-30T04:00:00.000Z");
    assert.equal(shopPeriodStart("month", new Date("2026-10-01T03:00:00.000Z")), "2026-09-01T04:00:00.000Z");
  });
});
