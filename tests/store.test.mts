import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

const password = randomBytes(12).toString("hex");
process.env.RITZY_DATA_DIR = mkdtempSync(path.join(tmpdir(), "ritzy-"));
process.env.RITZY_SEED = "0";
process.env.ADMIN_USERNAME = "mindy";
process.env.ADMIN_PASSWORD = password;

const store = await import("../src/lib/store.ts");

const blank = {
  title: "Test chair",
  description: "A test description",
  story: "A test story",
  era: "Test era",
  size: "Test size",
  askForPrice: true,
  priceCents: null,
  sold: false,
  published: false,
};

describe("store", { concurrency: 1 }, () => {
  test("password round trip", () => {
    const hash = store.hashPassword(password);
    assert.equal(store.verifyPassword(password, hash), true);
    assert.equal(store.verifyPassword(`${password}x`, hash), false);
  });

  test("login session", () => {
    assert.equal(store.startSession("mindy", "not-the-password"), null);
    const token = store.startSession("mindy", password);
    assert.ok(token);
    assert.equal(store.getUserByToken(token ?? undefined)?.username, "mindy");
    store.endSession(token ?? "");
    assert.equal(store.getUserByToken(token ?? undefined), null);
  });

  test("drafts stay hidden until published, then sold pieces leave the floor", () => {
    const id = store.createDraft();
    assert.equal(store.getPublicPiece(id), null);
    assert.equal(
      store.listShopPieces().some((piece) => piece.id === id),
      false,
    );
    store.updatePiece(id, { ...blank, published: true });
    assert.ok(store.getPublicPiece(id));
    assert.equal(
      store.listShopPieces().some((piece) => piece.id === id),
      true,
    );
    assert.equal(
      store.listSoldPieces().some((piece) => piece.id === id),
      false,
    );
    store.updatePiece(id, { ...blank, published: true, sold: true });
    assert.equal(
      store.listShopPieces().some((piece) => piece.id === id),
      false,
    );
    assert.equal(
      store.listArrivals(10).some((piece) => piece.id === id),
      false,
    );
    assert.equal(
      store.listSoldPieces().some((piece) => piece.id === id),
      true,
    );
    const hold = store.validateSubmission({
      kind: "hold",
      pieceId: id,
      name: "Ada",
      email: "ada@example.com",
      message: "Please hold it",
      projectType: "",
      preferredTime: "",
    });
    assert.equal(hold.ok, false);
    const ask = store.validateSubmission({
      kind: "ask",
      pieceId: id,
      name: "Ada",
      email: "ada@example.com",
      message: "Is the finish original?",
      projectType: "",
      preferredTime: "",
    });
    assert.equal(ask.ok, true);
  });

  test("a question is saved for the inbox", () => {
    const id = store.createDraft();
    store.updatePiece(id, { ...blank, title: "Inbox chair", published: true });
    const missingName = store.validateSubmission({
      kind: "ask",
      pieceId: id,
      name: "",
      email: "ada@example.com",
      message: "Hello",
      projectType: "",
      preferredTime: "",
    });
    assert.equal(missingName.ok, false);
    const good = store.validateSubmission({
      kind: "ask",
      pieceId: id,
      name: "Ada",
      email: "ada@example.com",
      message: "Is this still there?",
      projectType: "",
      preferredTime: "",
    });
    assert.equal(good.ok, true);
    if (!good.ok) return;
    const submissionId = store.insertSubmission(good.value);
    const rows = store.listSubmissions();
    assert.ok(rows.some((row) => row.id === submissionId && row.message.includes("still there")));
  });

  test("an unpublished piece cannot take a hold", () => {
    const id = store.createDraft();
    const result = store.validateSubmission({
      kind: "hold",
      pieceId: id,
      name: "Ada",
      email: "ada@example.com",
      message: "Hold it",
      projectType: "",
      preferredTime: "",
    });
    assert.equal(result.ok, false);
  });

  test("price formatting", () => {
    assert.equal(store.formatPrice({ ask_for_price: 1, price_cents: null }), "Ask for price");
    assert.equal(store.formatPrice({ ask_for_price: 0, price_cents: 12550 }), "$125.50");
    assert.deepEqual(store.parsePriceInput(""), { ask: true, cents: null });
    assert.deepEqual(store.parsePriceInput("125.50"), { ask: false, cents: 12550 });
    assert.equal(store.parsePriceInput("abc").error, "price");
  });

  test("photo order and public photo gate", () => {
    const id = store.createDraft();
    const first = `${"a".repeat(32)}.jpg`;
    const second = `${"b".repeat(32)}.jpg`;
    store.addPiecePhoto(id, first);
    store.addPiecePhoto(id, second);
    const before = store.getPiece(id);
    assert.ok(before);
    assert.equal(store.isPublishedPiecePhoto(first), false);
    store.movePhoto(before.photos[1].id, "earlier");
    const after = store.getPiece(id);
    assert.equal(after?.photos[0].filename, second);
    store.updatePiece(id, { ...blank, published: true });
    assert.equal(store.isPublishedPiecePhoto(second), true);
  });
});
