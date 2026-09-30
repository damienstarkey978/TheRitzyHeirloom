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
import { ValueLookup } from "@/components/value-lookup";
import { formatPrice, formatWhen, getPiece, listLookups, listPieceChanges } from "@/lib/store";
import { PIECE_CATEGORIES, PIECE_STATUSES, statusLabel } from "@/lib/value";

export const metadata: Metadata = { title: "Edit piece" };
export const maxDuration = 60;

function priceValue(piece: { ask_for_price: number; price_cents: number | null }) {
  if (piece.ask_for_price || piece.price_cents == null) return "";
  return (piece.price_cents / 100).toFixed(2);
}

export default async function EditPiecePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string; lookup?: string }>;
}) {
  const { id: rawId } = await params;
  const query = await searchParams;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const piece = getPiece(id);
  if (!piece) notFound();
  const lookups = listLookups(id);
  const changes = listPieceChanges(id, 8);

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
      {query.lookup ? (
        <p role="status" className="mt-4 border border-gold px-3 py-2 text-sm">
          Lookup saved. Your price was left as you typed it.
        </p>
      ) : null}
      {query.error === "price" ? (
        <p role="alert" className="mt-4 border border-black px-3 py-2 text-sm">
          Enter a price like 125 or 125.50, or leave it blank to ask for price.
        </p>
      ) : null}
      {query.error === "cost" ? (
        <p role="alert" className="mt-4 border border-black px-3 py-2 text-sm">
          Enter the cost like 40 or 40.00, or leave it blank.
        </p>
      ) : null}
      {query.error === "quantity" ? (
        <p role="alert" className="mt-4 border border-black px-3 py-2 text-sm">
          Quantity needs to be a whole number.
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
        <p className="text-sm">SKU {piece.sku}. This number stays with the piece.</p>
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
        <p className="text-sm leading-6 text-black/80">
          Leave the price blank unless it is the real asking price. A suggested range never replaces this.
        </p>
        <label className="block">
          <span className="text-xs tracking-wide uppercase">Category</span>
          <select className={fieldClass} name="category" defaultValue={piece.category}>
            <option value="">Choose a category</option>
            {PIECE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <Field label="Era" name="era" defaultValue={piece.era} />
        <Field label="Maker" name="maker" defaultValue={piece.maker} />
        <Field label="Material" name="material" defaultValue={piece.material} />
        <Field label="Dimensions" name="dimensions" defaultValue={piece.dimensions || piece.size} />
        <Field label="Condition" name="condition" defaultValue={piece.condition} placeholder="Good, with wear" />
        <Field label="Tags" name="tags" defaultValue={piece.tags} placeholder="gilt, french, pair" />
        <Field label="Cost" name="cost" inputMode="decimal" placeholder="What you paid, optional" defaultValue={piece.cost_cents == null ? "" : (piece.cost_cents / 100).toFixed(2)} />
        <Field label="Quantity" name="quantity" inputMode="numeric" defaultValue={String(piece.quantity)} />
        <Field label="Barcode" name="barcode" defaultValue={piece.barcode} />
        <Field label="Location" name="location" defaultValue={piece.location} placeholder="Shop floor, back room" />
        <label className="block">
          <span className="text-xs tracking-wide uppercase">Status</span>
          <select className={fieldClass} name="status" defaultValue={piece.status}>
            {PIECE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {statusLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <p className="text-sm leading-6 text-black/80">
          Draft and held stay off the floor. Available is on the floor. Sold moves to the sold shelf.
        </p>
        <SubmitButton>Save piece</SubmitButton>
      </form>

      <ValueLookup piece={piece} lookups={lookups} />

      {changes.length > 0 ? (
        <section className="mt-10 max-w-xl">
          <h2 className="text-[0.65rem] tracking-[0.18em] uppercase">Changes</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {changes.map((change) => (
              <li key={change.id}>
                {formatWhen(change.changed_at)} · {change.field_name}
                {change.field_name === "created" ? ` ${change.new_value}` : ` → ${change.new_value || "cleared"}`}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="text-[0.65rem] tracking-[0.18em] uppercase">Photos</h2>
        {piece.photos.length === 0 ? <p className="mt-3 text-sm">No photos yet.</p> : null}
        <ul className="mt-4 flex flex-col gap-4">
          {piece.photos.map((photo, index) => (
            <li key={photo.id} className="border border-black/15 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/media/${photo.filename}?w=800`}
                alt={`${piece.title}, photo ${index + 1}`}
                width={800}
                height={600}
                loading="lazy"
                decoding="async"
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
            <span className="text-xs tracking-wide uppercase">Add photos</span>
            <span className="mt-1 block text-sm leading-6">Take one, or choose several from the camera roll.</span>
            <input
              className={`${fieldClass} file:mr-3 file:border-0 file:bg-transparent file:text-base`}
              type="file"
              name="photos"
              accept="image/*"
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
