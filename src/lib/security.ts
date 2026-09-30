import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookieSecure, gateToken, sitePassword } from "./config.ts";

export const SESSION_COOKIE = "ritzy_session";
export const CSRF_COOKIE = "ritzy_csrf";
export const CSRF_HEADER = "x-ritzy-csrf";
export const CSRF_FIELD = "csrf";
export const GATE_COOKIE = "ritzy_gate";

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: cookieSecure(),
    path: "/",
    maxAge,
  };
}

export function newCsrfToken() {
  return randomBytes(32).toString("hex");
}

export function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length || a.length === 0) return false;
  return timingSafeEqual(a, b);
}

export function csrfMatches(cookieValue: string | undefined, fieldValue: string | undefined) {
  if (!cookieValue || !fieldValue) return false;
  return safeEqual(cookieValue, fieldValue);
}

export function sitePasswordMatches(input: string) {
  const expected = sitePassword();
  if (!expected || !input) return false;
  const actualHash = createHash("sha256").update(input).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(actualHash, expectedHash);
}

export function gateCookieMatches(value: string | undefined) {
  const expected = gateToken();
  if (!expected || !value) return false;
  return safeEqual(value, expected);
}

export function clientAddress(forwardedFor: string | null, flyClientIp: string | null) {
  const fly = flyClientIp?.trim() ?? "";
  if (fly && fly.length <= 80 && !fly.includes(",")) return fly;
  const first = forwardedFor?.split(",")[0]?.trim() ?? "";
  if (!first || first.length > 80) return "local";
  return first;
}

export function publicUrl(request: Request, path: string) {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ?? "";
  const hostHeader = request.headers.get("host")?.trim() ?? "";
  const host = [forwardedHost, hostHeader].find(
    (value) => value && !value.startsWith("0.0.0.0"),
  );
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const local = host?.startsWith("localhost") || host?.startsWith("127.0.0.1");
  const proto = forwardedProto || (local ? "http" : "https");
  if (host) return new URL(path, `${proto}://${host}`);
  return new URL(path, request.url);
}

export function safeNextPath(raw: string) {
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("://") || raw.includes("\\")) {
    return "/";
  }
  const pathOnly = raw.split("?")[0];
  if (!pathOnly.startsWith("/") || pathOnly.startsWith("//")) return "/";
  return pathOnly;
}
