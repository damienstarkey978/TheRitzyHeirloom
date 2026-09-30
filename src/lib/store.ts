import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { dataDir, maxUploadBytes, tokenHash } from "./config.ts";
import { SESSION_COOKIE } from "./security.ts";
import { assertDatabaseDriver, putUpload, removeUpload, sqlitePath, uploadsDir } from "./storage.ts";

export { SESSION_COOKIE };
export const SESSION_MAX_AGE = 60 * 60 * 24 * 14;
export const LOGIN_LIMIT = 8;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export { dataDir, uploadsDir };

export const PROJECT_TYPES = [
  "A home",
  "A hospitality project",
  "A shop or showroom",
  "Something else",
] as const;

export const SUBMISSION_LABELS: Record<string, string> = {
  ask: "Question",
  hold: "Hold request",
  trade: "Fabric and wallpaper sample",
  visit: "Private visit",
  signup: "New arrivals list",
  consignment: "Consignment offer",
};

const KINDS = new Set(["ask", "hold", "trade", "visit", "signup", "consignment"]);

export type Piece = {
  id: number;
  title: string;
  description: string;
  story: string;
  price_cents: number | null;
  ask_for_price: number;
  era: string;
  size: string;
  sold: number;
  published: number;
  is_sample: number;
  created_at: string;
  updated_at: string;
};

export type Photo = {
  id: number;
  piece_id: number;
  filename: string;
  sort_order: number;
};

export type PieceCard = Piece & { cover: string | null };
export type PieceFull = Piece & { photos: Photo[] };

export type SubmissionKind = "ask" | "hold" | "trade" | "visit" | "signup" | "consignment";

export type NormalizedSubmission = {
  kind: SubmissionKind;
  pieceId: number | null;
  name: string;
  email: string;
  message: string;
  projectType: string;
  preferredTime: string;
};

export type Submission = {
  id: number;
  kind: string;
  piece_id: number | null;
  piece_title: string | null;
  name: string;
  email: string;
  message: string;
  project_type: string;
  preferred_time: string;
  created_at: string;
  photos: { id: number; filename: string }[];
};

type DbGlobal = typeof globalThis & { __ritzyDb?: DatabaseSync };

const globalForDb = globalThis as DbGlobal;

const CARD_SELECT = `
  SELECT p.id, p.title, p.description, p.story, p.price_cents, p.ask_for_price, p.era, p.size,
         p.sold, p.published, p.is_sample, p.created_at, p.updated_at,
         (
           SELECT ph.filename FROM piece_photos ph
           WHERE ph.piece_id = p.id
           ORDER BY ph.sort_order ASC, ph.id ASC
           LIMIT 1
         ) AS cover
  FROM pieces p
`;

function nowIso() {
  return new Date().toISOString();
}

function one<T>(value: unknown): T | undefined {
  if (value === undefined || value === null) return undefined;
  return value as T;
}

export function uploadPath(filename: string): string | null {
  if (!/^[a-f0-9]{32}\.jpg$/.test(filename)) return null;
  const root = path.resolve(uploadsDir());
  const full = path.resolve(root, filename);
  if (full !== path.join(root, filename)) return null;
  return full;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string) {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1], "hex");
  const expected = Buffer.from(parts[2], "hex");
  if (salt.length === 0 || expected.length === 0) return false;
  const actual = scryptSync(password, salt, expected.length);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

let dummyHash: string | null = null;

function dummyPasswordHash() {
  dummyHash ??= hashPassword("not-used");
  return dummyHash;
}

function ensureAdmin(db: DatabaseSync) {
  const username = (process.env.ADMIN_USERNAME || "mindy").trim();
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!username || !password) return;
  const existing = one<{ id: number; password_hash: string }>(
    db.prepare("SELECT id, password_hash FROM users WHERE username = ? COLLATE NOCASE").get(username),
  );
  if (existing) return;
  db.prepare("INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)").run(
    username,
    hashPassword(password),
    nowIso(),
  );
}

export function syncAdminFromEnv() {
  ensureAdmin(getDb());
}

function placeSample(sourceName: string) {
  const filename = `${randomBytes(16).toString("hex")}.jpg`;
  const from = path.join(process.cwd(), "src/lib/samples", sourceName);
  putUpload(filename, fs.readFileSync(from));
  return filename;
}

function seedIfEmpty(db: DatabaseSync) {
  if (process.env.RITZY_SEED === "0") return;
  const count = one<{ n: number }>(db.prepare("SELECT COUNT(*) AS n FROM pieces").get());
  if (Number(count?.n ?? 0) > 0) return;

  const pieces: Array<{
    title: string;
    description: string;
    story: string;
    era: string;
    size: string;
    sold: number;
    published: number;
    created_at: string;
    photos: string[];
  }> = [
    {
      title: "Sample gilt frame",
      description: "Sample description. This listing is demonstration data and is not a piece in the shop.",
      story: "Sample history for this private preview. It is not the story of a real piece.",
      era: "Sample entry",
      size: "Sample entry",
      sold: 0,
      published: 1,
      created_at: "2026-09-20T15:00:00.000Z",
      photos: ["frame-a.jpg", "frame-b.jpg"],
    },
    {
      title: "Sample printed linen",
      description: "Sample description. This listing is demonstration data and is not a piece in the shop.",
      story: "Sample history written so the story field has something to show. Not a real textile.",
      era: "",
      size: "",
      sold: 0,
      published: 1,
      created_at: "2026-09-24T15:00:00.000Z",
      photos: ["linen.jpg"],
    },
    {
      title: "Sample porcelain dish",
      description: "Sample description. This listing is demonstration data and is not a piece in the shop.",
      story: "Sample history for the lookbook. There is no real dish behind this card.",
      era: "",
      size: "",
      sold: 0,
      published: 1,
      created_at: "2026-09-28T15:00:00.000Z",
      photos: ["dish.jpg"],
    },
    {
      title: "Sample side chair",
      description: "Sample description. This sold mark is demonstration data, not a completed sale.",
      story: "Sample history for the sold shelf. No chair was sold.",
      era: "",
      size: "",
      sold: 1,
      published: 1,
      created_at: "2026-09-01T15:00:00.000Z",
      photos: ["chair.jpg"],
    },
    {
      title: "Sample wall mirror",
      description: "Sample description. This sold mark is demonstration data, not a completed sale.",
      story: "Sample history for the sold shelf. No mirror was sold.",
      era: "",
      size: "",
      sold: 1,
      published: 1,
      created_at: "2026-09-10T15:00:00.000Z",
      photos: ["mirror.jpg"],
    },
    {
      title: "Sample unlisted sketch",
      description: "Sample description. This draft should stay off the shop floor until it is published.",
      story: "Sample history on a hidden draft.",
      era: "",
      size: "",
      sold: 0,
      published: 0,
      created_at: "2026-09-29T15:00:00.000Z",
      photos: ["sketch.jpg"],
    },
  ];

  const placed: string[] = [];
  db.exec("BEGIN");
  try {
    for (const piece of pieces) {
      const inserted = db
        .prepare(
          `INSERT INTO pieces (
            title, description, story, price_cents, ask_for_price, era, size, sold, published, is_sample, created_at, updated_at
          ) VALUES (?, ?, ?, NULL, 1, ?, ?, ?, ?, 1, ?, ?)`,
        )
        .run(
          piece.title,
          piece.description,
          piece.story,
          piece.era,
          piece.size,
          piece.sold,
          piece.published,
          piece.created_at,
          piece.created_at,
        );
      const id = Number(inserted.lastInsertRowid);
      piece.photos.forEach((source, index) => {
        const filename = placeSample(source);
        placed.push(filename);
        db.prepare("INSERT INTO piece_photos (piece_id, filename, sort_order) VALUES (?, ?, ?)").run(
          id,
          filename,
          index,
        );
      });
    }
    db.exec("COMMIT");
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      /* the transaction may already be closed */
    }
    for (const filename of placed) {
      try {
        removeUpload(filename);
      } catch {
        /* the copy may not exist */
      }
    }
    throw error;
  }
}

export function getDb() {
  if (globalForDb.__ritzyDb) return globalForDb.__ritzyDb;
  assertDatabaseDriver();
  fs.mkdirSync(uploadsDir(), { recursive: true });
  const db = new DatabaseSync(sqlitePath());
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA busy_timeout = 3000");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY,
      token_hash TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS pieces (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      story TEXT NOT NULL DEFAULT '',
      price_cents INTEGER,
      ask_for_price INTEGER NOT NULL DEFAULT 1,
      era TEXT NOT NULL DEFAULT '',
      size TEXT NOT NULL DEFAULT '',
      sold INTEGER NOT NULL DEFAULT 0,
      published INTEGER NOT NULL DEFAULT 0,
      is_sample INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS piece_photos (
      id INTEGER PRIMARY KEY,
      piece_id INTEGER NOT NULL REFERENCES pieces(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY,
      kind TEXT NOT NULL,
      piece_id INTEGER REFERENCES pieces(id) ON DELETE SET NULL,
      name TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL DEFAULT '',
      project_type TEXT NOT NULL DEFAULT '',
      preferred_time TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS submission_photos (
      id INTEGER PRIMARY KEY,
      submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
      filename TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS pieces_public ON pieces (published, sold, created_at);
    CREATE INDEX IF NOT EXISTS piece_photos_piece ON piece_photos (piece_id, sort_order);
    CREATE TABLE IF NOT EXISTS login_attempts (
      id INTEGER PRIMARY KEY,
      attempt_key TEXT NOT NULL,
      attempted_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS login_attempts_key ON login_attempts (attempt_key, attempted_at);
  `);
  globalForDb.__ritzyDb = db;
  ensureAdmin(db);
  seedIfEmpty(db);
  return db;
}

export function formatPrice(piece: { ask_for_price: number; price_cents: number | null }) {
  if (piece.ask_for_price || piece.price_cents == null) return "Ask for price";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    piece.price_cents / 100,
  );
}

export function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return (
    new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(date) + " UTC"
  );
}

export function parsePriceInput(raw: string): { ask: boolean; cents: number | null; error?: "price" } {
  const trimmed = raw.trim();
  if (!trimmed) return { ask: true, cents: null };
  const normalized = trimmed.replace(/[$,]/g, "").replace(/\s/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return { ask: true, cents: null, error: "price" };
  const [whole, frac = ""] = normalized.split(".");
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents < 0 || cents > 100_000_000) {
    return { ask: true, cents: null, error: "price" };
  }
  return { ask: false, cents };
}

export function verifyLogin(username: string, password: string) {
  const db = getDb();
  const row = one<{ id: number; username: string; password_hash: string }>(
    db.prepare("SELECT id, username, password_hash FROM users WHERE username = ? COLLATE NOCASE").get(username.trim()),
  );
  const ok = verifyPassword(password, row?.password_hash ?? dummyPasswordHash());
  if (!row || !ok) return null;
  return { id: row.id, username: row.username };
}

export function startSession(username: string, password: string) {
  const user = verifyLogin(username, password);
  if (!user) {
    if (!process.env.ADMIN_PASSWORD) {
      console.error("Shop desk login is not configured. Set ADMIN_PASSWORD.");
    }
    return null;
  }
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();
  getDb()
    .prepare("INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
    .run(tokenHash(token), user.id, expires, nowIso());
  return token;
}

export function getUserByToken(token: string | undefined) {
  if (!token) return null;
  const db = getDb();
  const row = one<{ id: number; username: string; expires_at: string; session_id: number }>(
    db
      .prepare(
        `SELECT u.id, u.username, s.expires_at, s.id AS session_id
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ?`,
      )
      .get(tokenHash(token)),
  );
  if (!row) return null;
  if (row.expires_at < new Date().toISOString()) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(row.session_id);
    return null;
  }
  return { id: row.id, username: row.username };
}

export function endSession(token: string) {
  getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash(token));
}

export function loginFailureKey(ip: string, username: string) {
  return `${ip.slice(0, 80)}\n${username.trim().toLowerCase().slice(0, 200)}`;
}

export function tooManyLoginFailures(key: string) {
  const since = new Date(Date.now() - LOGIN_WINDOW_MS).toISOString();
  const row = one<{ n: number }>(
    getDb()
      .prepare("SELECT COUNT(*) AS n FROM login_attempts WHERE attempt_key = ? AND attempted_at >= ?")
      .get(key, since),
  );
  return Number(row?.n ?? 0) >= LOGIN_LIMIT;
}

export function recordLoginFailure(key: string) {
  const db = getDb();
  db.prepare("INSERT INTO login_attempts (attempt_key, attempted_at) VALUES (?, ?)").run(key, nowIso());
  const since = new Date(Date.now() - LOGIN_WINDOW_MS).toISOString();
  db.prepare("DELETE FROM login_attempts WHERE attempted_at < ?").run(since);
}

export function clearLoginFailures(key: string) {
  getDb().prepare("DELETE FROM login_attempts WHERE attempt_key = ?").run(key);
}

export function changePassword(username: string, current: string, next: string) {
  const user = verifyLogin(username, current);
  if (!user) return "current" as const;
  if (next.length < 10 || next.length > 200 || next !== next.trim()) return "short" as const;
  if (next === current) return "same" as const;
  getDb().prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(next), user.id);
  return "ok" as const;
}

function listCards(sql: string, ...params: unknown[]) {
  return getDb().prepare(sql).all(...params) as PieceCard[];
}

export function listShopPieces() {
  return listCards(
    `${CARD_SELECT} WHERE p.published = 1 AND p.sold = 0 ORDER BY p.created_at DESC, p.id DESC`,
  );
}

export function listSoldPieces() {
  return listCards(
    `${CARD_SELECT} WHERE p.published = 1 AND p.sold = 1 ORDER BY p.created_at DESC, p.id DESC`,
  );
}

export function listArrivals(limit = 12) {
  const size = Math.min(Math.max(limit, 1), 50);
  return listCards(
    `${CARD_SELECT} WHERE p.published = 1 AND p.sold = 0 ORDER BY p.created_at DESC, p.id DESC LIMIT ?`,
    size,
  );
}

export function listAllPieces() {
  return listCards(`${CARD_SELECT} ORDER BY p.updated_at DESC, p.id DESC`);
}

function photosFor(pieceId: number) {
  return getDb()
    .prepare(
      "SELECT id, piece_id, filename, sort_order FROM piece_photos WHERE piece_id = ? ORDER BY sort_order, id",
    )
    .all(pieceId) as Photo[];
}

export function getPiece(id: number): PieceFull | null {
  const piece = one<Piece>(getDb().prepare("SELECT * FROM pieces WHERE id = ?").get(id));
  if (!piece) return null;
  return { ...piece, photos: photosFor(piece.id) };
}

export function getPublicPiece(id: number) {
  const piece = getPiece(id);
  if (!piece || !piece.published) return null;
  return piece;
}

export function createDraft() {
  const now = nowIso();
  const inserted = getDb()
    .prepare(
      `INSERT INTO pieces (
        title, description, story, price_cents, ask_for_price, era, size, sold, published, is_sample, created_at, updated_at
      ) VALUES ('Untitled piece', '', '', NULL, 1, '', '', 0, 0, 0, ?, ?)`,
    )
    .run(now, now);
  return Number(inserted.lastInsertRowid);
}

export function addPiecePhoto(pieceId: number, filename: string) {
  const count = one<{ n: number }>(
    getDb().prepare("SELECT COUNT(*) AS n FROM piece_photos WHERE piece_id = ?").get(pieceId),
  );
  getDb()
    .prepare("INSERT INTO piece_photos (piece_id, filename, sort_order) VALUES (?, ?, ?)")
    .run(pieceId, filename, Number(count?.n ?? 0));
}

export function updatePiece(
  id: number,
  input: {
    title: string;
    description: string;
    story: string;
    era: string;
    size: string;
    askForPrice: boolean;
    priceCents: number | null;
    sold: boolean;
    published: boolean;
  },
) {
  const title = input.title.trim().slice(0, 200) || "Untitled piece";
  const result = getDb()
    .prepare(
      `UPDATE pieces
       SET title = ?, description = ?, story = ?, era = ?, size = ?,
           ask_for_price = ?, price_cents = ?, sold = ?, published = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      title,
      input.description.trim().slice(0, 5000),
      input.story.trim().slice(0, 5000),
      input.era.trim().slice(0, 200),
      input.size.trim().slice(0, 200),
      input.askForPrice ? 1 : 0,
      input.askForPrice ? null : input.priceCents,
      input.sold ? 1 : 0,
      input.published ? 1 : 0,
      nowIso(),
      id,
    );
  return Number(result.changes) > 0;
}

function unlinkIfUnused(filename: string) {
  const db = getDb();
  const pieceUse = one<{ n: number }>(
    db.prepare("SELECT COUNT(*) AS n FROM piece_photos WHERE filename = ?").get(filename),
  );
  const submissionUse = one<{ n: number }>(
    db.prepare("SELECT COUNT(*) AS n FROM submission_photos WHERE filename = ?").get(filename),
  );
  if (Number(pieceUse?.n ?? 0) === 0 && Number(submissionUse?.n ?? 0) === 0) {
    if (!uploadPath(filename)) return;
    removeUpload(filename);
  }
}

export function deletePiece(id: number) {
  const photos = getDb()
    .prepare("SELECT filename FROM piece_photos WHERE piece_id = ?")
    .all(id) as { filename: string }[];
  getDb().prepare("DELETE FROM pieces WHERE id = ?").run(id);
  for (const photo of photos) unlinkIfUnused(photo.filename);
}

export function movePhoto(photoId: number, direction: "earlier" | "later") {
  const db = getDb();
  const photo = one<{ id: number; piece_id: number }>(
    db.prepare("SELECT id, piece_id FROM piece_photos WHERE id = ?").get(photoId),
  );
  if (!photo) return;
  const photos = db
    .prepare("SELECT id FROM piece_photos WHERE piece_id = ? ORDER BY sort_order, id")
    .all(photo.piece_id) as { id: number }[];
  const index = photos.findIndex((item) => item.id === photoId);
  const swapWith = direction === "earlier" ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= photos.length) return;
  const next = photos.slice();
  const [item] = next.splice(index, 1);
  next.splice(swapWith, 0, item);
  db.exec("BEGIN");
  try {
    next.forEach((entry, order) => {
      db.prepare("UPDATE piece_photos SET sort_order = ? WHERE id = ?").run(order, entry.id);
    });
    db.exec("COMMIT");
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      /* already closed */
    }
    throw error;
  }
}

export function removePhoto(photoId: number) {
  const row = one<{ filename: string }>(
    getDb().prepare("SELECT filename FROM piece_photos WHERE id = ?").get(photoId),
  );
  if (!row) return;
  getDb().prepare("DELETE FROM piece_photos WHERE id = ?").run(photoId);
  unlinkIfUnused(row.filename);
}

export function isPublishedPiecePhoto(filename: string) {
  if (!/^[a-f0-9]{32}\.jpg$/.test(filename)) return false;
  const row = getDb()
    .prepare(
      `SELECT 1 AS ok FROM piece_photos ph
       JOIN pieces p ON p.id = ph.piece_id
       WHERE ph.filename = ? AND p.published = 1`,
    )
    .get(filename);
  return Boolean(row);
}

export function validateSubmission(input: {
  kind: string;
  pieceId: number | null;
  name: string;
  email: string;
  message: string;
  projectType: string;
  preferredTime: string;
}): { ok: true; value: NormalizedSubmission } | { ok: false; error: string } {
  if (!KINDS.has(input.kind)) return { ok: false, error: "kind" };
  const email = input.email.trim().slice(0, 200);
  const name = input.name.trim().slice(0, 200);
  const message = input.message.trim().slice(0, 5000);
  const projectType = input.projectType.trim().slice(0, 200);
  const preferredTime = input.preferredTime.trim().slice(0, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "email" };
  if (input.kind !== "signup" && !name) return { ok: false, error: "name" };
  if (
    (input.kind === "ask" ||
      input.kind === "hold" ||
      input.kind === "trade" ||
      input.kind === "consignment") &&
    !message
  ) {
    return { ok: false, error: "message" };
  }
  if (input.kind === "visit" && !preferredTime) return { ok: false, error: "time" };
  if (input.kind === "trade" && !PROJECT_TYPES.includes(projectType as (typeof PROJECT_TYPES)[number])) {
    return { ok: false, error: "project" };
  }
  let pieceId: number | null = null;
  if (input.kind === "ask" || input.kind === "hold") {
    if (!input.pieceId) return { ok: false, error: "piece" };
    const piece = getPublicPiece(input.pieceId);
    if (!piece) return { ok: false, error: "piece" };
    if (input.kind === "hold" && piece.sold) return { ok: false, error: "piece" };
    pieceId = piece.id;
  }
  return {
    ok: true,
    value: {
      kind: input.kind as SubmissionKind,
      pieceId,
      name: input.kind === "signup" ? "" : name,
      email,
      message,
      projectType: input.kind === "trade" ? projectType : "",
      preferredTime: input.kind === "visit" ? preferredTime : "",
    },
  };
}

export function insertSubmission(value: NormalizedSubmission) {
  const inserted = getDb()
    .prepare(
      `INSERT INTO submissions (
        kind, piece_id, name, email, message, project_type, preferred_time, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      value.kind,
      value.pieceId,
      value.name,
      value.email,
      value.message,
      value.projectType,
      value.preferredTime,
      nowIso(),
    );
  return Number(inserted.lastInsertRowid);
}

export function addSubmissionPhoto(submissionId: number, filename: string) {
  getDb()
    .prepare("INSERT INTO submission_photos (submission_id, filename) VALUES (?, ?)")
    .run(submissionId, filename);
}

export function listSubmissions(): Submission[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT s.id, s.kind, s.piece_id, s.name, s.email, s.message, s.project_type, s.preferred_time, s.created_at,
              p.title AS piece_title
       FROM submissions s
       LEFT JOIN pieces p ON p.id = s.piece_id
       ORDER BY s.created_at DESC, s.id DESC`,
    )
    .all() as Omit<Submission, "photos">[];
  const photos = db
    .prepare("SELECT id, submission_id, filename FROM submission_photos ORDER BY id")
    .all() as { id: number; submission_id: number; filename: string }[];
  const byId = new Map<number, { id: number; filename: string }[]>();
  for (const photo of photos) {
    const list = byId.get(photo.submission_id) ?? [];
    list.push({ id: photo.id, filename: photo.filename });
    byId.set(photo.submission_id, list);
  }
  return rows.map((row) => ({ ...row, photos: byId.get(row.id) ?? [] }));
}

export function submissionCount() {
  const row = one<{ n: number }>(getDb().prepare("SELECT COUNT(*) AS n FROM submissions").get());
  return Number(row?.n ?? 0);
}

export function inspectImage(input: Buffer): "ok" | "empty" | "large" | "type" {
  if (input.length === 0) return "empty";
  if (input.length > maxUploadBytes()) return "large";
  if (!imageKind(input)) return "type";
  return "ok";
}

function imageKind(input: Buffer) {
  if (input.length >= 3 && input[0] === 0xff && input[1] === 0xd8 && input[2] === 0xff) return "jpeg";
  if (
    input.length >= 8 &&
    input[0] === 0x89 &&
    input[1] === 0x50 &&
    input[2] === 0x4e &&
    input[3] === 0x47
  ) {
    return "png";
  }
  if (
    input.length >= 12 &&
    input.toString("ascii", 0, 4) === "RIFF" &&
    input.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "webp";
  }
  if (input.length >= 12 && input.toString("ascii", 4, 8) === "ftyp") {
    const brand = input.toString("ascii", 8, 12);
    if (["heic", "heix", "hevc", "hevx", "mif1", "msf1", "heim", "heis"].includes(brand)) return "heic";
  }
  return null;
}

export async function saveJpeg(input: Buffer) {
  const checked = inspectImage(input);
  if (checked !== "ok") throw new Error(checked);
  const sharp = (await import("sharp")).default;
  const filename = `${randomBytes(16).toString("hex")}.jpg`;
  const output = await sharp(input)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
  putUpload(filename, output);
  return filename;
}
