import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createPieceWithPhotos } from "@/lib/drafts";
import { currentUser } from "@/lib/session";
import { csrfMatches, CSRF_COOKIE, publicUrl } from "@/lib/security";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const form = await request.formData();
  const jar = await cookies();
  if (!csrfMatches(jar.get(CSRF_COOKIE)?.value, String(form.get("csrf") ?? ""))) {
    return NextResponse.json({ error: "This page expired. Reload it and try again." }, { status: 403 });
  }
  const files = form
    .getAll("photos")
    .filter((file): file is File => file instanceof File && file.size > 0);
  const buffers: Buffer[] = [];
  for (const file of files) buffers.push(Buffer.from(await file.arrayBuffer()));
  const result = await createPieceWithPhotos(buffers);
  if ("error" in result) {
    return NextResponse.json(result, { status: 400 });
  }
  if (request.headers.get("accept")?.includes("application/json")) {
    return NextResponse.json(result);
  }
  return NextResponse.redirect(publicUrl(request, `/admin/pieces/${result.id}`), 303);
}
