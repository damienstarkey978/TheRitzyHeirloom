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
process.env.SESSION_SECRET = randomBytes(32).toString("hex");
process.env.SITE_PASSWORD = "";
process.env.RITZY_EMAIL_DRIVER = "off";
process.env.RITZY_DATABASE_DRIVER = "sqlite";
process.env.RITZY_FILE_DRIVER = "local";
process.env.RITZY_COOKIE_SECURE = "0";
process.env.RITZY_BASE_URL = "http://127.0.0.1:4765";

const store = await import("../src/lib/store.ts");
const security = await import("../src/lib/security.ts");
const config = await import("../src/lib/config.ts");
const mail = await import("../src/lib/mail.ts");
const storage = await import("../src/lib/storage.ts");

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
    const token = store.startSession("Mindy", password);
    assert.ok(token);
    assert.equal(store.getUserByToken(token ?? undefined)?.username, "mindy");
    store.endSession(token ?? "");
    const lower = store.startSession("mindy", password);
    assert.ok(lower);
    assert.equal(store.getUserByToken(lower ?? undefined)?.username, "mindy");
    store.endSession(lower ?? "");
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

  test("login failures are limited", () => {
    const key = store.loginFailureKey("203.0.113.5", "mindy");
    store.clearLoginFailures(key);
    assert.equal(store.tooManyLoginFailures(key), false);
    for (let attempt = 0; attempt < store.LOGIN_LIMIT; attempt += 1) {
      store.recordLoginFailure(key);
    }
    assert.equal(store.tooManyLoginFailures(key), true);
    store.clearLoginFailures(key);
    assert.equal(store.tooManyLoginFailures(key), false);
  });

  test("redirects keep the public host", () => {
    const request = new Request("http://0.0.0.0:4765/api/gate", {
      headers: {
        host: "0.0.0.0:4765",
        "x-forwarded-host": "ritzy-heirloom-dev.fly.dev",
        "x-forwarded-proto": "https",
      },
    });
    assert.equal(security.publicUrl(request, "/shop").href, "https://ritzy-heirloom-dev.fly.dev/shop");
  });

  test("csrf rejects a missing or mismatched token, and the site gate checks its cookie", () => {
    assert.equal(security.csrfMatches("abc", "abc"), true);
    assert.equal(security.csrfMatches("abc", "abd"), false);
    assert.equal(security.csrfMatches(undefined, "abc"), false);
    assert.equal(security.gateCookieMatches("not-the-gate"), false);
    process.env.SITE_PASSWORD = "preview-lock";
    const expected = config.gateToken();
    assert.equal(security.gateCookieMatches(expected), true);
    assert.equal(security.sitePasswordMatches("preview-lock"), true);
    assert.equal(security.sitePasswordMatches("wrong-password"), false);
    process.env.SITE_PASSWORD = "";
    assert.equal(security.gateCookieMatches(expected), false);
  });

  test("photos must be a known image type", () => {
    assert.equal(store.inspectImage(Buffer.alloc(0)), "empty");
    assert.equal(store.inspectImage(Buffer.from("not-a-photo")), "type");
    assert.equal(store.inspectImage(Buffer.from([0xff, 0xd8, 0xff, 0x00])), "ok");
  });

  test("email stays off unless a webhook is configured", async () => {
    const notice = {
      kind: "ask",
      name: "Ada",
      email: "ada@example.com",
      message: "Is it still there?",
      projectType: "",
      preferredTime: "",
    };
    process.env.RITZY_EMAIL_DRIVER = "off";
    const quiet = await mail.sendSubmissionNotice(notice);
    assert.equal(quiet.delivered, false);
    const calls: string[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = async (url) => {
      calls.push(String(url));
      return new Response("ok", { status: 200 });
    };
    process.env.RITZY_EMAIL_DRIVER = "webhook";
    process.env.RITZY_EMAIL_WEBHOOK_URL = "https://example.test/hook";
    process.env.RITZY_NOTIFY_EMAIL = "desk@example.com";
    const sent = await mail.sendSubmissionNotice(notice);
    assert.equal(sent.delivered, true);
    assert.deepEqual(calls, ["https://example.test/hook"]);
    globalThis.fetch = original;
    process.env.RITZY_EMAIL_DRIVER = "off";
    delete process.env.RITZY_EMAIL_WEBHOOK_URL;
    delete process.env.RITZY_NOTIFY_EMAIL;
  });

  test("hosted database and object storage drivers are refused until they exist", () => {
    process.env.RITZY_DATABASE_DRIVER = "postgres";
    assert.throws(() => storage.assertDatabaseDriver(), /SQLite/);
    process.env.RITZY_DATABASE_DRIVER = "sqlite";
    process.env.RITZY_FILE_DRIVER = "s3";
    assert.throws(() => storage.assertFileDriver(), /local disk/);
    process.env.RITZY_FILE_DRIVER = "local";
  });

  test("sku stays put, held pieces stay off the floor, and a lookup does not rewrite the price", () => {
    const id = store.createDraft();
    const sku = `RH-${String(id).padStart(5, "0")}`;
    assert.equal(store.getPiece(id)?.sku, sku);
    store.updatePiece(id, { ...blank, title: "Gilt frame", published: true, category: "Fine art" });
    assert.equal(store.getPiece(id)?.sku, sku);
    assert.equal(store.getPiece(id)?.status, "available");
    assert.equal(
      store.listShopPieces("Fine art").some((piece) => piece.id === id),
      true,
    );
    assert.equal(
      store.listShopPieces("Jewelry").some((piece) => piece.id === id),
      false,
    );
    assert.equal(
      store.listAllPieces({ status: "available", q: "gilt" }).some((piece) => piece.id === id),
      true,
    );
    store.updatePiece(id, { ...blank, title: "Gilt frame", status: "held" });
    assert.equal(store.getPiece(id)?.status, "held");
    assert.equal(
      store.listShopPieces().some((piece) => piece.id === id),
      false,
    );
    const changes = store.listPieceChanges(id);
    assert.ok(changes.some((change) => change.field_name === "title" && change.new_value === "Gilt frame"));
    store.insertLookup(id, {
      query: "Gilt frame",
      listings: [
        { title: "A", url: "https://example.test/a", priceCents: 10000, currency: "USD", source: "keyword" },
        { title: "B", url: "https://example.test/b", priceCents: 30000, currency: "USD", source: "keyword" },
        { title: "C", url: "https://example.test/c", priceCents: 50000, currency: "USD", source: "image" },
      ],
      research: {
        configured: false,
        provider: "",
        maker: "",
        style: "",
        era: "",
        material: "",
        history: "",
        description: "",
        confidence: "",
        links: [],
        note: "AI lookup is not set up.",
      },
      note: "Based on 3 current asking prices. These are not sold prices.",
    });
    const piece = store.getPiece(id);
    assert.equal(piece?.price_cents, null);
    assert.equal(piece?.ask_for_price, 1);
    assert.equal(piece?.estimate_typical_cents, 30000);
    store.insertLookup(id, {
      query: "Gilt frame",
      listings: [],
      research: {
        configured: true,
        provider: "anthropic",
        maker: "",
        style: "",
        era: "",
        material: "",
        history: "",
        description: "",
        confidence: "",
        links: [],
        note: "",
      },
      note: "Typical blends 1 sold price.",
      range: { low: 10000, typical: 20000, high: 30000, count: 1 },
      usage: { inputTokens: 10, outputTokens: 10, searchCount: 1, costMicros: 2_010_000, aiCalled: true },
    });
    const priced = store.getPiece(id);
    assert.equal(priced?.price_cents, null);
    assert.equal(priced?.estimate_typical_cents, 20000);
    assert.equal(store.countAiLookupsSince(store.shopPeriodStart("day")), 1);
    assert.equal(store.lookupCostMicrosSince(store.shopPeriodStart("month")), 2_010_000);
    assert.match(store.piecesToCsv(), new RegExp(sku));
    store.updatePiece(id, { ...blank, title: 'Frame, "gilt"', status: "held" });
    assert.match(store.piecesToCsv(), /"Frame, ""gilt"""/);
  });

  test("a changed desk password stays after the environment password is read again", () => {
    const next = randomBytes(12).toString("hex");
    assert.equal(store.changePassword("mindy", "not-the-password", next), "current");
    assert.equal(store.changePassword("mindy", password, next), "ok");
    store.syncAdminFromEnv();
    assert.equal(store.startSession("mindy", password), null);
    const token = store.startSession("mindy", next);
    assert.ok(token);
    store.endSession(token ?? "");
  });
});
