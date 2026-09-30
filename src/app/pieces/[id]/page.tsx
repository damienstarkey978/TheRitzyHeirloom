import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Field,
  PageShell,
  SaveHint,
  SavedNote,
  SubmitButton,
  TextArea,
} from "@/components/ui";
import { formatPrice, getPublicPiece } from "@/lib/store";

type PieceParams = { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> };

export async function generateMetadata({ params }: PieceParams): Promise<Metadata> {
  const { id } = await params;
  const piece = getPublicPiece(Number(id));
  return { title: piece?.title ?? "Piece" };
}

export default async function PiecePage({ params, searchParams }: PieceParams) {
  const { id: rawId } = await params;
  const query = await searchParams;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const piece = getPublicPiece(id);
  if (!piece) notFound();
  const price = formatPrice(piece);

  return (
    <PageShell title={piece.title}>
      {piece.is_sample ? (
        <p className="mt-3 text-sm text-gold">Sample data. Not a piece in the shop.</p>
      ) : null}
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="flex flex-col gap-3">
          {piece.photos.length === 0 ? (
            <div className="flex aspect-[4/3] items-center justify-center border border-gold">
              <span className="text-[0.65rem] tracking-[0.16em] uppercase">No photo yet</span>
            </div>
          ) : (
            piece.photos.map((photo, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={photo.id}
                src={`/api/media/${photo.filename}`}
                alt={
                  piece.is_sample
                    ? `Sample image ${index + 1} for ${piece.title}`
                    : `${piece.title}, photo ${index + 1}`
                }
                className="aspect-[4/3] w-full object-cover"
              />
            ))
          )}
        </div>
        <div>
          {piece.sold ? (
            <p className="text-[0.7rem] tracking-[0.18em] text-gold uppercase">Sold</p>
          ) : null}
          <p className="mt-2 text-lg">{price}</p>
          {piece.era ? <p className="mt-3 text-sm">Era: {piece.era}</p> : null}
          {piece.size ? <p className="mt-1 text-sm">Size: {piece.size}</p> : null}
          {piece.description ? <p className="mt-4 text-sm leading-6">{piece.description}</p> : null}
          {piece.story ? (
            <section className="mt-6">
              <h2 className="text-[0.65rem] tracking-[0.18em] uppercase">A short history</h2>
              <p className="mt-2 text-sm leading-6">{piece.story}</p>
            </section>
          ) : null}
          <form action="/api/submissions" method="post" encType="multipart/form-data" className="mt-8 flex flex-col gap-4">
            <input type="hidden" name="piece_id" value={piece.id} />
            <input type="hidden" name="return_to" value={`/pieces/${piece.id}`} />
            <fieldset>
              <legend className="text-[0.65rem] tracking-[0.16em] uppercase">Ask or hold</legend>
              {piece.sold ? <p className="mt-2 text-sm">This piece is marked sold.</p> : null}
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input type="radio" name="kind" value="ask" defaultChecked className="accent-gold" />
                Ask a question
              </label>
              {piece.sold ? null : (
                <label className="mt-2 flex items-center gap-2 text-sm">
                  <input type="radio" name="kind" value="hold" className="accent-gold" />
                  Request a hold
                </label>
              )}
            </fieldset>
            <Field label="Name" name="name" required autoComplete="name" />
            <Field label="Email" name="email" type="email" required autoComplete="email" />
            <TextArea label="Note" name="message" required placeholder="What would you like to know?" />
            <label className="block">
              <span className="text-[0.65rem] tracking-[0.16em] uppercase">Bring a photo</span>
              <span className="mt-1 block text-sm leading-6">
                A room, or an item you want something in the spirit of. Optional.
              </span>
              <input className="mt-2 block w-full text-base" type="file" name="photo" accept="image/*" />
            </label>
            <SaveHint />
            <SavedNote saved={query.saved} error={query.error} />
            <SubmitButton>Save this note</SubmitButton>
          </form>
          <p className="mt-6 text-sm">
            <Link href="/shop" className="tracking-[0.14em] uppercase hover:text-gold">
              Back to the shop
            </Link>
          </p>
        </div>
      </div>
    </PageShell>
  );
}
