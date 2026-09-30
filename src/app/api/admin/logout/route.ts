import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { endSession, SESSION_COOKIE } from "@/lib/store";
import { cookieOptions, csrfMatches, CSRF_COOKIE } from "@/lib/security";

export async function POST(request: Request) {
  const form = await request.formData();
  const jar = await cookies();
  if (!csrfMatches(jar.get(CSRF_COOKIE)?.value, String(form.get("csrf") ?? ""))) {
    return NextResponse.redirect(new URL("/admin", request.url), 303);
  }
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) endSession(token);
  const response = NextResponse.redirect(new URL("/admin/login", request.url), 303);
  response.cookies.set(SESSION_COOKIE, "", cookieOptions(0));
  return response;
}
