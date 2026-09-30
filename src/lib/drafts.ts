import { MAX_UPLOAD_FILES, maxUploadBytes } from "./config.ts";
import { addPiecePhoto, createDraft, deletePiece, saveJpeg } from "./store.ts";

type PieceDraftResult = { error: string } | { id: number; saved: number; received: number };

export async function createPieceWithPhotos(files: Buffer[]): Promise<PieceDraftResult> {
  if (files.length === 0) return { error: "Choose at least one photo." as const };
  if (files.length > MAX_UPLOAD_FILES) return { error: "Choose up to 8 photos at a time." as const };
  if (files.some((file) => file.length > maxUploadBytes())) {
    return { error: "Each photo needs to be under 20MB." as const };
  }
  const id = createDraft();
  let saved = 0;
  for (const file of files) {
    try {
      const filename = await saveJpeg(file);
      addPiecePhoto(id, filename);
      saved += 1;
    } catch {
      /* skip a file the server cannot read */
    }
  }
  if (saved === 0) {
    deletePiece(id);
    return { error: "Those photos could not be saved. Try a JPEG or PNG." as const };
  }
  return { id, saved, received: files.length };
}
