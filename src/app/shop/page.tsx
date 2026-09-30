import type { Metadata } from "next";
import { PieceCard, PageShell, SampleBanner } from "@/components/ui";
import { listShopPieces } from "@/lib/store";

export const metadata: Metadata = { title: "Shop" };

export default function ShopPage() {
  const pieces = listShopPieces();
  return (
    <PageShell
      title="Shop"
      lead="Published pieces on the floor. Drafts stay in the shop desk until they are published."
    >
      {pieces.some((piece) => piece.is_sample) ? <SampleBanner /> : null}
      {pieces.length === 0 ? (
        <p className="mt-8 text-sm">Nothing is on the floor yet.</p>
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
