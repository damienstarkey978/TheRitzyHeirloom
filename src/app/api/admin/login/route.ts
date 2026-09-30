import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE, startSession } from "@/lib/store";

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.RITZY_COOKIE_SECURE === "1",
    path: "/",
    maxAge,
  };
}

export async function POST(request: Request) {
  const form = await request.formData();
  const username = String(form.get("username") ?? "");
  const password = String(form.get("password") ?? "");
  const token = startSession(username, password);
  if (!token) {
    return NextResponse.redirect(new URL("/admin/login?error=1", request.url), 303);
  }
  const response = NextResponse.redirect(new URL("/admin", request.url), 303);
  response.cookies.set(SESSION_COOKIE, token, cookieOptions(SESSION_MAX_AGE));
  return response;
}
