import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { inventoryCsv, posAuthorized, type InventoryRow } from "../src/lib/pos.ts";

const row: InventoryRow = {
  sku: "RH-00001",
  barcode: "",
  title: 'Frame, "gilt"',
  category: "Fine art",
  maker: "",
  material: "",
  era: "",
  dimensions: "",
  condition: "",
  tags: "",
  cost_cents: null,
  price_cents: null,
  ask_for_price: true,
  quantity: 1,
  status: "draft",
  location: "",
  created_at: "2026-09-30T00:00:00.000Z",
  updated_at: "2026-09-30T00:00:00.000Z",
};

describe("pos", () => {
  test("the bearer token must match, and a missing token is not a denial of a set secret", () => {
    assert.equal(posAuthorized("Bearer secret-token", "secret-token"), "ok");
    assert.equal(posAuthorized("Bearer other-token", "secret-token"), "denied");
    assert.equal(posAuthorized(null, ""), "unset");
  });

  test("csv quotes commas and quotes", () => {
    const csv = inventoryCsv([row]);
    assert.match(csv, /^sku,barcode,title,/);
    assert.match(csv, /"Frame, ""gilt"""/);
  });
});
