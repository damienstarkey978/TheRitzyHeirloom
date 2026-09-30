import { createHmac, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export function dataDir() {
  return process.env.RITZY_DATA_DIR || path.join(process.cwd(), "data");
}

export function baseUrl() {
  return (process.env.RITZY_BASE_URL ?? "").replace(/\/$/, "");
}

export function sitePassword() {
  return (process.env.SITE_PASSWORD ?? "").trim();
}

export function maxUploadBytes() {
  const raw = Number(process.env.RITZY_MAX_UPLOAD_BYTES ?? 20 * 1024 * 1024);
  if (!Number.isFinite(raw) || raw < 1) return 20 * 1024 * 1024;
  return Math.min(Math.floor(raw), 48 * 1024 * 1024);
}

export const MAX_UPLOAD_FILES = 8;

function readSecretFile() {
  const file = path.join(dataDir(), ".session-secret");
  try {
    const existing = fs.readFileSync(file, "utf8").trim();
    if (existing) return existing;
  } catch {
    /* create one below */
  }
  fs.mkdirSync(dataDir(), { recursive: true });
  const created = randomBytes(32).toString("hex");
  fs.writeFileSync(file, `${created}\n`, { mode: 0o600 });
  return created;
}

export function sessionSecret() {
  const fromEnv = process.env.SESSION_SECRET?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
    throw new Error("SESSION_SECRET is required in production.");
  }
  return readSecretFile();
}

export function tokenHash(token: string) {
  return createHmac("sha256", sessionSecret()).update(token).digest("hex");
}

export function gateToken() {
  const password = sitePassword();
  if (!password) return "";
  return createHmac("sha256", sessionSecret()).update(`gate:${password}`).digest("hex");
}

function positiveInt(name: string, fallback: number, max: number) {
  const raw = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(raw) || raw < 1) return fallback;
  return Math.min(raw, max);
}

export function aiLookupDailyLimit() {
  return positiveInt("AI_LOOKUP_DAILY_LIMIT", 40, 500);
}

export function aiMaxSearches() {
  return positiveInt("AI_MAX_SEARCHES", 5, 8);
}

export function aiMaxImages() {
  return positiveInt("AI_MAX_IMAGES", 4, 6);
}

export function aiTimeoutMs() {
  const raw = Number(process.env.AI_TIMEOUT_MS ?? 45000);
  if (!Number.isFinite(raw) || raw < 5000) return 45000;
  return Math.min(Math.floor(raw), 55000);
}

export function cookieSecure() {
  if (process.env.RITZY_COOKIE_SECURE === "1") return true;
  if (process.env.RITZY_COOKIE_SECURE === "0") return false;
  const base = process.env.RITZY_BASE_URL ?? "";
  if (base.startsWith("https://")) return true;
  if (base.startsWith("http://")) return false;
  return process.env.NODE_ENV === "production";
}
