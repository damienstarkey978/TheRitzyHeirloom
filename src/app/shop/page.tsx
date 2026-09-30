import type { Metadata } from "next";
import Link from "next/link";
import { PieceCard, PageShell, SampleBanner } from "@/components/ui";
import { listShopPieces } from "@/lib/store";
import { PIECE_CATEGORIES, cleanCategory } from "@/lib/value";

export const metadata: Metadata = { title: "Shop" };

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const query = await searchParams;
  const category = cleanCategory(query.category ?? "");
  const pieces = listShopPieces(category);
  return (
    <PageShell
      title="Shop"
      lead="Published pieces on the floor. Drafts stay in the shop desk until they are published."
    >
      <nav aria-label="Categories" className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <Link href="/shop" className={category ? "underline hover:text-gold" : "text-gold"}>
          All
        </Link>
        {PIECE_CATEGORIES.map((name) => (
          <Link
            key={name}
            href={`/shop?category=${encodeURIComponent(name)}`}
            className={category === name ? "text-gold" : "underline hover:text-gold"}
          >
            {name}
          </Link>
        ))}
      </nav>
      {pieces.some((piece) => piece.is_sample) ? <SampleBanner /> : null}
      {pieces.length === 0 ? (
        <p className="mt-8 text-sm">
          {category ? `Nothing in ${category} is on the floor.` : "Nothing is on the floor yet."}
        </p>
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
