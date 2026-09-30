"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MAX_UPLOAD_FILES, maxUploadBytes } from "@/lib/config";
import { requireUser } from "@/lib/session";
import { csrfMatches, CSRF_COOKIE } from "@/lib/security";
import {
  addPiecePhoto,
  changePassword,
  createDraft,
  deletePiece,
  getPiece,
  movePhoto,
  parsePriceInput,
  removePhoto,
  saveJpeg,
  updatePiece,
} from "@/lib/store";

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
  const limit = maxUploadBytes();
  if (files.length === 0) return { error: "Choose at least one photo." };
  if (files.length > MAX_UPLOAD_FILES) return { error: "Choose up to 8 photos at a time." };
  if (files.some((file) => file.size > limit)) {
    return { error: "Each photo needs to be under 20MB." };
  }
  const id = createDraft();
  let saved = 0;
  for (const file of files) {
    try {
      const filename = await saveJpeg(Buffer.from(await file.arrayBuffer()));
      addPiecePhoto(id, filename);
      saved += 1;
    } catch {
      /* skip a file that cannot be read and report if none survive */
    }
  }
  if (saved === 0) {
    deletePiece(id);
    return { error: "Those photos could not be saved. Try a JPEG or PNG." };
  }
  refresh(id);
  redirect(`/admin/pieces/${id}`);
}

export async function updatePieceAction(formData: FormData) {
  await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || !getPiece(id)) redirect("/admin/pieces");
  if (!(await formIsTrusted(formData))) redirect(`/admin/pieces/${id}?error=form`);
  const parsed = parsePriceInput(String(formData.get("price") ?? ""));
  if (parsed.error) redirect(`/admin/pieces/${id}?error=price`);
  updatePiece(id, {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    story: String(formData.get("story") ?? ""),
    era: String(formData.get("era") ?? ""),
    size: String(formData.get("size") ?? ""),
    askForPrice: parsed.ask,
    priceCents: parsed.cents,
    sold: formData.get("sold") === "on",
    published: formData.get("published") === "on",
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
