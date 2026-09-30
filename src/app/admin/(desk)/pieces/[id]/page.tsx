import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addPhotosAction,
  deletePieceAction,
  movePhotoAction,
  removePhotoAction,
  updatePieceAction,
} from "@/app/admin/actions";
import { CsrfField } from "@/components/csrf-field";
import { Field, PageShell, SubmitButton, TextArea, buttonClass, fieldClass, quietButtonClass } from "@/components/ui";
import { formatPrice, getPiece } from "@/lib/store";

export const metadata: Metadata = { title: "Edit piece" };

function priceValue(piece: { ask_for_price: number; price_cents: number | null }) {
  if (piece.ask_for_price || piece.price_cents == null) return "";
  return (piece.price_cents / 100).toFixed(2);
}

export default async function EditPiecePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id: rawId } = await params;
  const query = await searchParams;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const piece = getPiece(id);
  if (!piece) notFound();

  return (
    <PageShell title={piece.title}>
      {!piece.published ? (
        <p className="mt-3 border border-gold px-3 py-2 text-sm">
          This draft is hidden from the shop until you publish it.
        </p>
      ) : (
        <p className="mt-3 text-sm">
          On the floor as {formatPrice(piece)}.{" "}
          <Link href={`/pieces/${piece.id}`} className="underline hover:text-gold">
            View the public page
          </Link>
        </p>
      )}
      {piece.is_sample ? <p className="mt-3 text-sm text-gold">This listing is sample data.</p> : null}
      {query.saved ? (
        <p role="status" className="mt-4 border border-gold px-3 py-2 text-sm">
          Saved.
        </p>
      ) : null}
      {query.error === "price" ? (
        <p role="alert" className="mt-4 border border-black px-3 py-2 text-sm">
          Enter a price like 125 or 125.50, or leave it blank to ask for price.
        </p>
      ) : null}
      {query.error === "photo" || query.error === "photos" ? (
        <p role="alert" className="mt-4 border border-black px-3 py-2 text-sm">
          That photo could not be saved. Try a JPEG or PNG.
        </p>
      ) : null}
      {query.error === "form" ? (
        <p role="alert" className="mt-4 border border-black px-3 py-2 text-sm">
          This page expired. Reload it and try again.
        </p>
      ) : null}

      <form action={updatePieceAction} className="mt-6 flex max-w-xl flex-col gap-4">
        <CsrfField />
        <input type="hidden" name="id" value={piece.id} />
        <Field label="Title" name="title" required defaultValue={piece.title} />
        <TextArea label="Description" name="description" defaultValue={piece.description} />
        <TextArea label="A short history" name="story" defaultValue={piece.story} />
        <Field
          label="Price"
          name="price"
          inputMode="decimal"
          placeholder="Leave blank to ask for price"
          defaultValue={priceValue(piece)}
        />
        <p className="text-sm leading-6 text-black/80">Leave the price blank unless it is the real asking price.</p>
        <Field label="Era" name="era" defaultValue={piece.era} />
        <Field label="Size" name="size" defaultValue={piece.size} />
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="published"
            defaultChecked={piece.published === 1}
            className="size-4 accent-[#b07c28]"
          />
          Publish on the shop floor
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="sold" defaultChecked={piece.sold === 1} className="size-4 accent-[#b07c28]" />
          Mark sold
        </label>
        <p className="text-sm leading-6 text-black/80">
          Published sold pieces move to the sold shelf. Drafts stay hidden.
        </p>
        <SubmitButton>Save piece</SubmitButton>
      </form>

      <section className="mt-10">
        <h2 className="text-[0.65rem] tracking-[0.18em] uppercase">Photos</h2>
        {piece.photos.length === 0 ? <p className="mt-3 text-sm">No photos yet.</p> : null}
        <ul className="mt-4 flex flex-col gap-4">
          {piece.photos.map((photo, index) => (
            <li key={photo.id} className="border border-black/15 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/media/${photo.filename}`}
                alt={`${piece.title}, photo ${index + 1}`}
                className="aspect-[4/3] w-full max-w-md object-cover"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <form action={movePhotoAction}>
                  <CsrfField />
                  <input type="hidden" name="id" value={piece.id} />
                  <input type="hidden" name="photo_id" value={photo.id} />
                  <input type="hidden" name="direction" value="earlier" />
                  <button type="submit" className={quietButtonClass} disabled={index === 0}>
                    Move earlier
                  </button>
                </form>
                <form action={movePhotoAction}>
                  <CsrfField />
                  <input type="hidden" name="id" value={piece.id} />
                  <input type="hidden" name="photo_id" value={photo.id} />
                  <input type="hidden" name="direction" value="later" />
                  <button type="submit" className={quietButtonClass} disabled={index === piece.photos.length - 1}>
                    Move later
                  </button>
                </form>
                <form action={removePhotoAction}>
                  <CsrfField />
                  <input type="hidden" name="id" value={piece.id} />
                  <input type="hidden" name="photo_id" value={photo.id} />
                  <button type="submit" className={quietButtonClass}>
                    Remove photo
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
        <form action={addPhotosAction} className="mt-4 flex max-w-xl flex-col gap-3">
          <CsrfField />
          <input type="hidden" name="id" value={piece.id} />
          <label className="block">
            <span className="text-[0.65rem] tracking-[0.16em] uppercase">Add photos</span>
            <input
              className={`${fieldClass} file:mr-3 file:border-0 file:bg-transparent file:text-sm`}
              type="file"
              name="photos"
              accept="image/*"
              capture="environment"
              multiple
            />
          </label>
          <button type="submit" className={`${buttonClass} w-full sm:w-auto`}>
            Upload photos
          </button>
        </form>
      </section>

      <form action={deletePieceAction} className="mt-12 border-t border-black/10 pt-6">
        <CsrfField />
        <input type="hidden" name="id" value={piece.id} />
        <p className="text-sm leading-6">This removes the piece and its photos from this computer.</p>
        <button type="submit" className={`${quietButtonClass} mt-3`}>
          Delete piece
        </button>
      </form>
    </PageShell>
  );
}
