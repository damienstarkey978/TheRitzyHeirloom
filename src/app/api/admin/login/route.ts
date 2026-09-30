import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  clearLoginFailures,
  loginFailureKey,
  recordLoginFailure,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  startSession,
  tooManyLoginFailures,
} from "@/lib/store";
import { clientAddress, cookieOptions, csrfMatches, CSRF_COOKIE } from "@/lib/security";

export async function POST(request: Request) {
  const form = await request.formData();
  const username = String(form.get("username") ?? "");
  const password = String(form.get("password") ?? "");
  const jar = await cookies();
  const key = loginFailureKey(
    clientAddress(request.headers.get("x-forwarded-for"), request.headers.get("fly-client-ip")),
    username,
  );
  const denied = () => NextResponse.redirect(new URL("/admin/login?error=1", request.url), 303);
  if (!csrfMatches(jar.get(CSRF_COOKIE)?.value, String(form.get("csrf") ?? ""))) {
    return denied();
  }
  if (tooManyLoginFailures(key)) return denied();
  const token = startSession(username, password);
  if (!token) {
    recordLoginFailure(key);
    return denied();
  }
  clearLoginFailures(key);
  const response = NextResponse.redirect(new URL("/admin", request.url), 303);
  response.cookies.set(SESSION_COOKIE, token, cookieOptions(SESSION_MAX_AGE));
  return response;
}
