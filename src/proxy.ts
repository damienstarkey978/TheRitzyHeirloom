import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { sitePassword } from "@/lib/config";
import {
  CSRF_COOKIE,
  CSRF_HEADER,
  cookieOptions,
  GATE_COOKIE,
  gateCookieMatches,
  newCsrfToken,
  publicUrl,
  SESSION_COOKIE,
} from "@/lib/security";

const CSRF_MAX_AGE = 60 * 60 * 24 * 14;

function continueWith(request: NextRequest, redirectTo?: URL) {
  let token = request.cookies.get(CSRF_COOKIE)?.value ?? "";
  const fresh = !/^[a-f0-9]{64}$/.test(token);
  if (fresh) token = newCsrfToken();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(CSRF_HEADER, token);
  if (request.nextUrl.pathname === "/gate" || request.nextUrl.pathname.startsWith("/gate/")) {
    requestHeaders.set("x-ritzy-gate", "1");
  }
  const response = redirectTo
    ? NextResponse.redirect(redirectTo)
    : NextResponse.next({ request: { headers: requestHeaders } });
  if (fresh) {
    response.cookies.set(CSRF_COOKIE, token, cookieOptions(CSRF_MAX_AGE));
  }
  return response;
}

function adminNeedsLogin(pathname: string) {
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) return false;
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function gateExempt(pathname: string) {
  return pathname === "/gate" || pathname.startsWith("/gate/") || pathname === "/api/gate";
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (sitePassword() && !gateExempt(pathname) && !gateCookieMatches(request.cookies.get(GATE_COOKIE)?.value)) {
    const gate = publicUrl(request, "/gate");
    if (pathname !== "/") gate.searchParams.set("next", pathname);
    return continueWith(request, gate);
  }
  if (adminNeedsLogin(pathname) && !request.cookies.get(SESSION_COOKIE)?.value) {
    return continueWith(request, publicUrl(request, "/admin/login"));
  }
  return continueWith(request);
}

export const config = {
  matcher: [
    // The wordmark has to load on the password page. Piece photos live under /api/media and stay behind the gate.
    "/((?!_next/static|_next/image|logo\\.jpg|favicon\\.ico).*)",
  ],
};
