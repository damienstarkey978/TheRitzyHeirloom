import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/ui";
import { buttonClass, fieldClass } from "@/components/styles";
import { formatPrice, listAllPieces } from "@/lib/store";
import { PIECE_STATUSES, statusLabel } from "@/lib/value";

export const metadata: Metadata = { title: "Pieces" };

export default async function PiecesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const query = await searchParams;
  const q = query.q ?? "";
  const status = query.status ?? "";
  const pieces = listAllPieces({ q, status });
  return (
    <PageShell title="Pieces" lead="Search the inventory. Drafts stay hidden until you publish them.">
      <form action="/admin/pieces" className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="block flex-1">
          <span className="text-xs tracking-wide uppercase">Search</span>
          <input className={fieldClass} name="q" defaultValue={q} placeholder="Title, SKU, maker, tag" />
        </label>
        <label className="block sm:w-48">
          <span className="text-xs tracking-wide uppercase">Status</span>
          <select className={fieldClass} name="status" defaultValue={status}>
            <option value="">All</option>
            {PIECE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {statusLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={`${buttonClass} w-full sm:w-auto`}>
          Filter
        </button>
      </form>
      <p className="mt-4">
        <a href="/api/admin/export" className="inline-flex min-h-11 items-center text-sm underline hover:text-gold">
          Download inventory CSV
        </a>
      </p>
      {pieces.length === 0 ? (
        <p className="mt-8 text-sm">
          {q || status ? "No pieces match that search." : "No pieces yet."}{" "}
          <Link href="/admin/pieces/new" className="inline-flex min-h-11 items-center underline hover:text-gold">
            Add one
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-black/10 border-y border-black/10">
          {pieces.map((piece) => (
            <li key={piece.id}>
              <Link href={`/admin/pieces/${piece.id}`} className="flex min-h-16 items-center gap-3 py-3 hover:text-gold">
                {piece.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/media/${piece.cover}?w=480`}
                    alt=""
                    width={480}
                    height={480}
                    loading="lazy"
                    decoding="async"
                    className="h-16 w-16 shrink-0 object-cover"
                  />
                ) : (
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center border border-gold text-xs uppercase">
                    No photo
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base">{piece.title}</span>
                  <span className="block text-sm text-black">
                    {piece.sku}
                    {piece.category ? ` · ${piece.category}` : ""} · {formatPrice(piece)}
                  </span>
                </span>
                <span className="max-w-24 shrink-0 text-right text-xs leading-4 text-black uppercase">
                  {piece.is_sample ? "Sample · " : ""}
                  {statusLabel(piece.status)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
