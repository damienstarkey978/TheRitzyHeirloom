import type { Metadata } from "next";
import { PageShell, PieceCard, SampleBanner } from "@/components/ui";
import { listSoldPieces } from "@/lib/store";

export const metadata: Metadata = { title: "Sold shelf" };

export default function SoldPage() {
  const pieces = listSoldPieces();
  return (
    <PageShell
      title="Sold shelf"
      lead="Published pieces marked sold leave the shop floor and stay here."
    >
      {pieces.some((piece) => piece.is_sample) ? <SampleBanner /> : null}
      {pieces.length === 0 ? (
        <p className="mt-8 text-sm">The sold shelf is empty.</p>
      ) : (
        <ul className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {pieces.map((piece) => (
            <PieceCard key={piece.id} piece={piece} />
          ))}
        </ul>
      )}
    </PageShell>
  );
}
