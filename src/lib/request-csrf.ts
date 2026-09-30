import { cookies, headers } from "next/headers";
import { CSRF_COOKIE, CSRF_HEADER } from "./security.ts";

export async function csrfValue() {
  const headerToken = (await headers()).get(CSRF_HEADER) ?? "";
  if (headerToken) return headerToken;
  const jar = await cookies();
  return jar.get(CSRF_COOKIE)?.value ?? "";
}
