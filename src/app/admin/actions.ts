"use server";

import fs from "node:fs";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MAX_UPLOAD_FILES, maxUploadBytes } from "@/lib/config";
import { searchAskingByImage, searchAskingPrices } from "@/lib/ebay";
import { researchPiece } from "@/lib/research";
import { requireUser } from "@/lib/session";
import { csrfMatches, CSRF_COOKIE } from "@/lib/security";
import { createPieceWithPhotos } from "@/lib/drafts";
import {
  addPiecePhoto,
  changePassword,
  deletePiece,
  getLookup,
  getPiece,
  insertLookup,
  movePhoto,
  parseOptionalMoney,
  parsePriceInput,
  removePhoto,
  saveJpeg,
  updatePiece,
  uploadPath,
} from "@/lib/store";
import type { AskingListing } from "@/lib/value";
import { cleanStatus } from "@/lib/value";

async function formIsTrusted(formData: FormData) {
  const jar = await cookies();
  return csrfMatches(jar.get(CSRF_COOKIE)?.value, String(formData.get("csrf") ?? ""));
}

function refresh(id: number) {
  revalidatePath("/shop");
  revalidatePath("/sold");
  revalidatePath("/arrivals");
  revalidatePath(`/pieces/${id}`);
  revalidatePath("/admin");
  revalidatePath("/admin/pieces");
  revalidatePath(`/admin/pieces/${id}`);
}

function filesFrom(formData: FormData) {
  return formData
    .getAll("photos")
    .filter((file): file is File => file instanceof File && file.size > 0);
}

export async function createPieceFromPhotos(
  _prev: { error: string },
  formData: FormData,
): Promise<{ error: string }> {
  await requireUser();
  if (!(await formIsTrusted(formData))) {
    return { error: "This page expired. Reload it and try again." };
  }
  const files = filesFrom(formData);
  const buffers: Buffer[] = [];
  for (const file of files) buffers.push(Buffer.from(await file.arrayBuffer()));
  const result = await createPieceWithPhotos(buffers);
  if ("error" in result) return { error: result.error };
  refresh(result.id);
  redirect(`/admin/pieces/${result.id}`);
}

export async function updatePieceAction(formData: FormData) {
  await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || !getPiece(id)) redirect("/admin/pieces");
  if (!(await formIsTrusted(formData))) redirect(`/admin/pieces/${id}?error=form`);
  const parsed = parsePriceInput(String(formData.get("price") ?? ""));
  if (parsed.error) redirect(`/admin/pieces/${id}?error=price`);
  const cost = parseOptionalMoney(String(formData.get("cost") ?? ""));
  if (cost.error) redirect(`/admin/pieces/${id}?error=cost`);
  const quantityRaw = String(formData.get("quantity") ?? "").trim();
  const quantity = quantityRaw ? Number(quantityRaw) : 1;
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 100_000) {
    redirect(`/admin/pieces/${id}?error=quantity`);
  }
  const current = getPiece(id);
  if (!current) redirect("/admin/pieces");
  const dimensions = String(formData.get("dimensions") ?? "");
  updatePiece(id, {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    story: String(formData.get("story") ?? ""),
    era: String(formData.get("era") ?? ""),
    size: dimensions,
    dimensions,
    askForPrice: parsed.ask,
    priceCents: parsed.cents,
    sold: false,
    published: false,
    status: cleanStatus(String(formData.get("status") ?? "")) || current.status,
    category: String(formData.get("category") ?? ""),
    maker: String(formData.get("maker") ?? ""),
    material: String(formData.get("material") ?? ""),
    condition: String(formData.get("condition") ?? ""),
    tags: String(formData.get("tags") ?? ""),
    barcode: String(formData.get("barcode") ?? ""),
    location: String(formData.get("location") ?? ""),
    costCents: cost.cents,
    quantity,
  });
  refresh(id);
  redirect(`/admin/pieces/${id}?saved=1`);
}

export async function addPhotosAction(formData: FormData) {
  await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || !getPiece(id)) redirect("/admin/pieces");
  if (!(await formIsTrusted(formData))) redirect(`/admin/pieces/${id}?error=form`);
  const files = filesFrom(formData);
  const limit = maxUploadBytes();
  if (files.length === 0) redirect(`/admin/pieces/${id}?error=photos`);
  if (files.length > MAX_UPLOAD_FILES || files.some((file) => file.size > limit)) {
    redirect(`/admin/pieces/${id}?error=photo`);
  }
  let saved = 0;
  for (const file of files) {
    try {
      const filename = await saveJpeg(Buffer.from(await file.arrayBuffer()));
      addPiecePhoto(id, filename);
      saved += 1;
    } catch {
      /* counted below */
    }
  }
  if (saved === 0) redirect(`/admin/pieces/${id}?error=photo`);
  refresh(id);
  redirect(`/admin/pieces/${id}?saved=1`);
}

export async function movePhotoAction(formData: FormData) {
  await requireUser();
  const id = Number(formData.get("id"));
  if (!(await formIsTrusted(formData))) {
    redirect(Number.isInteger(id) ? `/admin/pieces/${id}?error=form` : "/admin/pieces");
  }
  const photoId = Number(formData.get("photo_id"));
  const direction = formData.get("direction") === "later" ? "later" : "earlier";
  const piece = Number.isInteger(id) ? getPiece(id) : null;
  if (!piece || !piece.photos.some((photo) => photo.id === photoId)) redirect("/admin/pieces");
  movePhoto(photoId, direction);
  refresh(id);
}

export async function removePhotoAction(formData: FormData) {
  await requireUser();
  const id = Number(formData.get("id"));
  if (!(await formIsTrusted(formData))) {
    redirect(Number.isInteger(id) ? `/admin/pieces/${id}?error=form` : "/admin/pieces");
  }
  const photoId = Number(formData.get("photo_id"));
  const piece = Number.isInteger(id) ? getPiece(id) : null;
  if (!piece || !piece.photos.some((photo) => photo.id === photoId)) redirect("/admin/pieces");
  removePhoto(photoId);
  refresh(id);
}

export async function deletePieceAction(formData: FormData) {
  await requireUser();
  const id = Number(formData.get("id"));
  if (!(await formIsTrusted(formData))) {
    redirect(Number.isInteger(id) ? `/admin/pieces/${id}?error=form` : "/admin/pieces");
  }
  if (Number.isInteger(id)) deletePiece(id);
  revalidatePath("/shop");
  revalidatePath("/sold");
  revalidatePath("/arrivals");
  revalidatePath("/admin");
  revalidatePath("/admin/pieces");
  redirect("/admin/pieces");
}

async function lookupJpeg(filename: string) {
  const full = uploadPath(filename);
  if (!full) return null;
  const sharp = (await import("sharp")).default;
  return sharp(fs.readFileSync(full))
    .rotate()
    .resize({ width: 500, height: 500, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 70 })
    .toBuffer();
}

function mergeListings(groups: AskingListing[][]) {
  const seen = new Set<string>();
  const listings: AskingListing[] = [];
  for (const group of groups) {
    for (const listing of group) {
      if (seen.has(listing.url)) continue;
      seen.add(listing.url);
      listings.push(listing);
    }
  }
  return listings;
}

export async function lookupValueAction(formData: FormData) {
  await requireUser();
  const id = Number(formData.get("id"));
  const piece = Number.isInteger(id) ? getPiece(id) : null;
  if (!piece) redirect("/admin/pieces");
  if (!(await formIsTrusted(formData))) redirect(`/admin/pieces/${id}?error=form`);
  const keyword = await searchAskingPrices(piece.title === "Untitled piece" ? "" : piece.title);
  let image = { listings: [] as AskingListing[], error: "" };
  let imageBase64 = "";
  const cover = piece.photos[0]?.filename;
  if (cover) {
    try {
      const jpeg = await lookupJpeg(cover);
      if (jpeg) {
        imageBase64 = jpeg.toString("base64");
        image = await searchAskingByImage(jpeg);
      }
    } catch {
      image = { listings: [], error: "The photo could not be sent for lookup." };
    }
  }
  const research = await researchPiece({
    title: piece.title,
    notes: [piece.description, piece.story, piece.maker, piece.material, piece.era].filter(Boolean).join("\n"),
    imageBase64,
  });
  const listings = mergeListings([keyword.listings, image.listings]);
  const problems = [...new Set([keyword.error, image.error].filter(Boolean))];
  const note = problems.length
    ? problems.join(" ")
    : listings.length
      ? `Based on ${listings.length} current asking prices. These are not sold prices.`
      : "No current asking prices came back.";
  insertLookup(id, { query: piece.title, listings, research, note });
  refresh(id);
  redirect(`/admin/pieces/${id}?lookup=1`);
}

export async function acceptLookupAction(formData: FormData) {
  await requireUser();
  const id = Number(formData.get("id"));
  const lookupId = Number(formData.get("lookup_id"));
  const piece = Number.isInteger(id) ? getPiece(id) : null;
  const lookup = Number.isInteger(lookupId) ? getLookup(lookupId) : null;
  if (!piece || !lookup || lookup.piece_id !== piece.id) redirect("/admin/pieces");
  if (!(await formIsTrusted(formData))) redirect(`/admin/pieces/${id}?error=form`);
  const research = lookup.research;
  updatePiece(id, {
    title: piece.title,
    description: research.description || piece.description,
    story: research.history || piece.story,
    era: research.era || piece.era,
    size: piece.size,
    askForPrice: piece.ask_for_price === 1,
    priceCents: piece.price_cents,
    sold: piece.sold === 1,
    published: piece.published === 1,
    status: piece.status,
    maker: research.maker || piece.maker,
    material: research.material || piece.material,
    category: piece.category,
    condition: piece.condition,
    tags: piece.tags,
    dimensions: piece.dimensions,
    barcode: piece.barcode,
    location: piece.location,
    costCents: piece.cost_cents,
    quantity: piece.quantity,
  });
  refresh(id);
  redirect(`/admin/pieces/${id}?saved=1`);
}

export async function changePasswordAction(formData: FormData) {
  const user = await requireUser();
  if (!(await formIsTrusted(formData))) redirect("/admin/password?error=form");
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (next !== confirm) redirect("/admin/password?error=confirm");
  const result = changePassword(user.username, current, next);
  if (result !== "ok") redirect(`/admin/password?error=${result}`);
  redirect("/admin/password?saved=1");
}
