import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/ui";
import { formatPrice, listAllPieces } from "@/lib/store";

export const metadata: Metadata = { title: "Pieces" };

function status(piece: { published: number; sold: number }) {
  if (!piece.published) return "Draft";
  if (piece.sold) return "Sold";
  return "On the floor";
}

export default function PiecesPage() {
  const pieces = listAllPieces();
  return (
    <PageShell title="Pieces" lead="Drafts stay hidden until you publish them.">
      {pieces.length === 0 ? (
        <p className="mt-8 text-sm">
          No pieces yet.{" "}
          <Link href="/admin/pieces/new" className="underline hover:text-gold">
            Add one
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-black/10 border-y border-black/10">
          {pieces.map((piece) => (
            <li key={piece.id}>
              <Link href={`/admin/pieces/${piece.id}`} className="flex items-center gap-4 py-3 hover:text-gold">
                {piece.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/media/${piece.cover}`}
                    alt=""
                    className="h-16 w-16 shrink-0 object-cover"
                  />
                ) : (
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center border border-gold text-[0.6rem] tracking-[0.12em] uppercase">
                    No photo
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{piece.title}</span>
                  <span className="block text-sm text-black">{formatPrice(piece)}</span>
                </span>
                <span className="shrink-0 text-right text-[0.65rem] tracking-[0.14em] text-black uppercase">
                  {piece.is_sample ? "Sample · " : ""}
                  {status(piece)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
