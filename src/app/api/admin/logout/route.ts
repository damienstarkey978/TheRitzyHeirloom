import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { endSession, SESSION_COOKIE } from "@/lib/store";

export async function POST(request: Request) {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) endSession(token);
  const response = NextResponse.redirect(new URL("/admin/login", request.url), 303);
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.RITZY_COOKIE_SECURE === "1",
    path: "/",
    maxAge: 0,
  });
  return response;
}
