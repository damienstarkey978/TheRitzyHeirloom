import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { maxUploadBytes } from "@/lib/config";
import { sendSubmissionNotice } from "@/lib/mail";
import { csrfMatches, CSRF_COOKIE } from "@/lib/security";
import { addSubmissionPhoto, insertSubmission, saveJpeg, validateSubmission } from "@/lib/store";

function safeNext(raw: string) {
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("://") || raw.includes("\\")) {
    return "/shop";
  }
  const pathOnly = raw.split("?")[0];
  const allowed = ["/shop", "/sold", "/arrivals", "/visit", "/trade", "/consign"];
  if (allowed.includes(pathOnly) || /^\/pieces\/\d+$/.test(pathOnly)) return pathOnly;
  return "/shop";
}

function fail(request: Request, next: string, error: string) {
  return NextResponse.redirect(new URL(`${next}?error=${encodeURIComponent(error)}`, request.url), 303);
}

export async function POST(request: Request) {
  const form = await request.formData();
  const next = safeNext(String(form.get("return_to") ?? ""));
  const jar = await cookies();
  if (!csrfMatches(jar.get(CSRF_COOKIE)?.value, String(form.get("csrf") ?? ""))) {
    return fail(request, next, "form");
  }
  const rawId = String(form.get("piece_id") ?? "").trim();
  const pieceId = rawId ? Number(rawId) : null;
  if (rawId && !Number.isInteger(pieceId)) return fail(request, next, "piece");

  const parsed = validateSubmission({
    kind: String(form.get("kind") ?? ""),
    pieceId,
    name: String(form.get("name") ?? ""),
    email: String(form.get("email") ?? ""),
    message: String(form.get("message") ?? ""),
    projectType: String(form.get("project_type") ?? ""),
    preferredTime: String(form.get("preferred_time") ?? ""),
  });
  if (!parsed.ok) return fail(request, next, parsed.error);

  const photo = form.get("photo");
  let filename: string | null = null;
  const limit = maxUploadBytes();
  if (photo instanceof File && photo.size > 0) {
    if (photo.size > limit) return fail(request, next, "photo");
    try {
      filename = await saveJpeg(Buffer.from(await photo.arrayBuffer()));
    } catch {
      return fail(request, next, "photo");
    }
  }

  const id = insertSubmission(parsed.value);
  if (filename) addSubmissionPhoto(id, filename);
  await sendSubmissionNotice({
    kind: parsed.value.kind,
    name: parsed.value.name,
    email: parsed.value.email,
    message: parsed.value.message,
    projectType: parsed.value.projectType,
    preferredTime: parsed.value.preferredTime,
  });
  return NextResponse.redirect(new URL(`${next}?saved=1`, request.url), 303);
}
