import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { gateToken, sitePassword } from "@/lib/config";
import {
  cookieOptions,
  csrfMatches,
  CSRF_COOKIE,
  GATE_COOKIE,
  safeNextPath,
  sitePasswordMatches,
} from "@/lib/security";

export async function POST(request: Request) {
  const form = await request.formData();
  const jar = await cookies();
  const next = safeNextPath(String(form.get("next") ?? "/"));
  if (!csrfMatches(jar.get(CSRF_COOKIE)?.value, String(form.get("csrf") ?? ""))) {
    return NextResponse.redirect(new URL("/gate?error=1", request.url), 303);
  }
  if (!sitePassword()) {
    return NextResponse.redirect(new URL("/", request.url), 303);
  }
  if (!sitePasswordMatches(String(form.get("password") ?? ""))) {
    return NextResponse.redirect(new URL("/gate?error=1", request.url), 303);
  }
  const response = NextResponse.redirect(new URL(next, request.url), 303);
  response.cookies.set(GATE_COOKIE, gateToken(), cookieOptions(60 * 60 * 24 * 14));
  return response;
}
