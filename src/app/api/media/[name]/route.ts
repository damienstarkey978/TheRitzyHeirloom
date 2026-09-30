import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { uploadsDir } from "@/lib/storage";
import { getUserByToken, isPublishedPiecePhoto, SESSION_COOKIE, uploadPath } from "@/lib/store";

const WIDTHS = new Set([480, 800, 1200]);

async function sizedBytes(full: string, name: string, width: number) {
  const cacheDir = path.join(uploadsDir(), "cache");
  const cached = path.join(cacheDir, `${width}-${name}`);
  try {
    return await readFile(cached);
  } catch {
    /* create it below */
  }
  const sharp = (await import("sharp")).default;
  const output = await sharp(full)
    .rotate()
    .resize({ width, height: width, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 76 })
    .toBuffer();
  await mkdir(cacheDir, { recursive: true });
  await writeFile(cached, output);
  return output;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ name: string }> },
) {
  const { name } = await context.params;
  const full = uploadPath(name);
  if (!full) return new Response("Not found", { status: 404 });
  const requested = Number(new URL(request.url).searchParams.get("w") ?? "");

  const jar = await cookies();
  const user = getUserByToken(jar.get(SESSION_COOKIE)?.value);
  if (!user && !isPublishedPiecePhoto(name)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const bytes =
      WIDTHS.has(requested) ? await sizedBytes(full, name, requested) : await readFile(full);
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
