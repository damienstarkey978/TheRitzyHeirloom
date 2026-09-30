import { readFile } from "node:fs/promises";
import { cookies } from "next/headers";
import { getUserByToken, isPublishedPiecePhoto, SESSION_COOKIE, uploadPath } from "@/lib/store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ name: string }> },
) {
  const { name } = await context.params;
  const full = uploadPath(name);
  if (!full) return new Response("Not found", { status: 404 });

  const jar = await cookies();
  const user = getUserByToken(jar.get(SESSION_COOKIE)?.value);
  if (!user && !isPublishedPiecePhoto(name)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const bytes = await readFile(full);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
