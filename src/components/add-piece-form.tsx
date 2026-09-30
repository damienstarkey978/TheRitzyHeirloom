"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { buttonClass, quietButtonClass } from "@/components/styles";

type Prepared = { name: string; blob: Blob; preview: string };

async function resizePhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = Math.min(1, 1600 / longest);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("resize");
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob) throw new Error("resize");
  return blob;
}

function uploadDraft(files: Prepared[], csrfToken: string, onProgress: (ratio: number) => void) {
  return new Promise<{ id: number; saved: number; received: number }>((resolve, reject) => {
    const body = new FormData();
    body.set("csrf", csrfToken);
    files.forEach((file, index) => body.append("photos", file.blob, `photo-${index + 1}.jpg`));
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/draft");
    xhr.timeout = 120000;
    xhr.setRequestHeader("Accept", "application/json");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      let payload: { id?: number; saved?: number; received?: number; error?: string } = {};
      try {
        payload = JSON.parse(xhr.responseText) as typeof payload;
      } catch {
        payload = {};
      }
      if (xhr.status >= 200 && xhr.status < 300 && payload.id) {
        resolve({ id: payload.id, saved: payload.saved ?? files.length, received: payload.received ?? files.length });
        return;
      }
      reject(new Error(payload.error || "The upload did not finish."));
    };
    xhr.onerror = () => reject(new Error("The connection dropped. Your photos are still here."));
    xhr.ontimeout = () => reject(new Error("The upload took too long. Your photos are still here."));
    xhr.send(body);
  });
}

export function AddPieceForm({ csrfToken }: { csrfToken: string }) {
  const router = useRouter();
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<Prepared[]>([]);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function addFiles(list: FileList | null) {
    const incoming = [...(list ?? [])];
    if (incoming.length === 0) return;
    setError("");
    setBusy(true);
    const next = [...photos];
    for (let index = 0; index < incoming.length; index += 1) {
      if (next.length >= 8) break;
      const file = incoming[index];
      setStatus(`Preparing photo ${index + 1} of ${incoming.length}…`);
      try {
        const blob = await resizePhoto(file);
        next.push({ name: file.name, blob, preview: URL.createObjectURL(blob) });
      } catch {
        next.push({ name: file.name, blob: file, preview: URL.createObjectURL(file) });
      }
    }
    setPhotos(next);
    setStatus("");
    setBusy(false);
  }

  function removePhoto(index: number) {
    setPhotos((current) => {
      const copy = [...current];
      const [removed] = copy.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.preview);
      return copy;
    });
  }

  async function save() {
    if (photos.length === 0 || busy) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setError("You look offline. The photos stay on this phone until the connection comes back.");
      return;
    }
    setBusy(true);
    setError("");
    setProgress(0);
    setStatus("Uploading…");
    try {
      const result = await uploadDraft(photos, csrfToken, (ratio) => {
        setProgress(ratio);
        setStatus(`Uploading ${Math.round(ratio * 100)}%`);
      });
      router.push(`/admin/pieces/${result.id}`);
    } catch (caught) {
      setProgress(null);
      setStatus("");
      setBusy(false);
      setError(caught instanceof Error ? caught.message : "The upload did not finish.");
    }
  }

  return (
    <div className="mt-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={`${buttonClass} w-full cursor-pointer`}>
          Take a photo
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(event) => {
              void addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
        <label className={`${buttonClass} w-full cursor-pointer`}>
          Choose photos
          <input
            ref={libraryRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(event) => {
              void addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
      </div>
      <p className="mt-3 text-sm leading-6">
        Take several, or choose them from the camera roll. Photos are resized on this phone before they upload. The
        draft stays off the shop floor until you publish it.
      </p>
      {photos.length > 0 ? (
        <ul className="mt-4 grid grid-cols-3 gap-2">
          {photos.map((photo, index) => (
            <li key={photo.preview} className="border border-black/15">
              {/* Local preview of a photo that has not been uploaded yet. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.preview} alt="" className="aspect-square w-full object-cover" />
              <button type="button" className={`${quietButtonClass} w-full`} onClick={() => removePhoto(index)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {status ? (
        <p className="mt-4 text-sm" role="status">
          {status}
        </p>
      ) : null}
      {progress != null ? (
        <progress className="mt-2 h-2 w-full" value={progress} max={1}>
          {Math.round(progress * 100)}%
        </progress>
      ) : null}
      {error ? (
        <p role="alert" className="mt-4 border border-black px-3 py-2 text-sm leading-6">
          {error}
        </p>
      ) : null}
      <button type="button" className={`${buttonClass} mt-4 w-full`} disabled={busy || photos.length === 0} onClick={() => void save()}>
        {error ? "Try again" : "Save photos as a draft"}
      </button>
    </div>
  );
}
