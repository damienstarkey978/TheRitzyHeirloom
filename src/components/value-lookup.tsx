import { acceptLookupAction, lookupValueAction } from "@/app/admin/actions";
import { CopyAmount } from "@/components/copy-amount";
import { CsrfField } from "@/components/csrf-field";
import { buttonClass } from "@/components/styles";
import { formatPrice, formatWhen, type PieceFull, type PieceLookup } from "@/lib/store";
import { dollars } from "@/lib/value";

function money(listing: { priceCents: number | null; currency: string }) {
  if (listing.priceCents == null) return "Price not listed";
  if (listing.currency === "USD") return `$${dollars(listing.priceCents)}`;
  return `${listing.currency} ${dollars(listing.priceCents)}`;
}

function hasDraft(lookup: PieceLookup) {
  const research = lookup.research;
  return Boolean(research.description || research.history || research.maker || research.era || research.material);
}

export function ValueLookup({
  piece,
  lookups,
}: {
  piece: PieceFull;
  lookups: PieceLookup[];
}) {
  const latest = lookups[0];
  return (
    <section className="mt-10 max-w-xl border border-gold p-4">
      <h2 className="text-lg">Look up value and history</h2>
      <p className="mt-2 text-sm leading-6">
        This checks current asking prices. It does not change the price you typed. Asking prices are
        not sold prices.
      </p>
      <form action={lookupValueAction} className="mt-4">
        <CsrfField />
        <input type="hidden" name="id" value={piece.id} />
        <button type="submit" className={`${buttonClass} w-full`}>
          Look up value and history
        </button>
      </form>

      {piece.estimate_typical_cents != null ? (
        <div className="mt-5">
          <p className="text-sm leading-6">Suggested range, kept separate from your price ({formatPrice(piece)}).</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyAmount label="Low" cents={piece.estimate_low_cents ?? piece.estimate_typical_cents} />
            <CopyAmount label="Typical" cents={piece.estimate_typical_cents} />
            <CopyAmount label="High" cents={piece.estimate_high_cents ?? piece.estimate_typical_cents} />
          </div>
          {piece.estimate_note ? <p className="mt-3 text-sm leading-6">{piece.estimate_note}</p> : null}
        </div>
      ) : piece.estimate_note ? (
        <p className="mt-4 text-sm leading-6">{piece.estimate_note}</p>
      ) : null}

      {latest?.research.note ? <p className="mt-4 text-sm leading-6">{latest.research.note}</p> : null}
      {latest && hasDraft(latest) ? (
        <div className="mt-4 border border-black/15 p-3">
          <p className="text-sm leading-6">
            Suggested text
            {latest.research.confidence ? `, confidence ${latest.research.confidence}` : ""}. Nothing
            here replaces your words until you accept it.
          </p>
          {latest.research.maker ? <p className="mt-2 text-sm">Maker: {latest.research.maker}</p> : null}
          {latest.research.style ? <p className="mt-1 text-sm">Style: {latest.research.style}</p> : null}
          {latest.research.era ? <p className="mt-1 text-sm">Era: {latest.research.era}</p> : null}
          {latest.research.material ? <p className="mt-1 text-sm">Material: {latest.research.material}</p> : null}
          {latest.research.description ? (
            <p className="mt-3 text-sm leading-6 whitespace-pre-wrap">{latest.research.description}</p>
          ) : null}
          {latest.research.history ? (
            <p className="mt-3 text-sm leading-6 whitespace-pre-wrap">{latest.research.history}</p>
          ) : null}
          {latest.research.links.length > 0 ? (
            <ul className="mt-3 flex flex-col text-sm">
              {latest.research.links.map((link) => (
                <li key={link.url} className="min-w-0">
                  <a
                    href={link.url}
                    className="flex min-h-11 items-center break-words underline hover:text-gold"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {link.title}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          <form action={acceptLookupAction} className="mt-4">
            <CsrfField />
            <input type="hidden" name="id" value={piece.id} />
            <input type="hidden" name="lookup_id" value={latest.id} />
            <button type="submit" className={`${buttonClass} w-full sm:w-auto`}>
              Accept this draft
            </button>
          </form>
        </div>
      ) : null}

      {latest && latest.listings.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-sm">Active listings — asking prices, not sold prices</h3>
          <ul className="mt-3 flex flex-col gap-3">
            {latest.listings.slice(0, 8).map((listing) => (
              <li key={listing.url} className="min-w-0 text-sm leading-6">
                <a
                  href={listing.url}
                  className="flex min-h-11 items-center break-words underline hover:text-gold"
                  target="_blank"
                  rel="noreferrer"
                >
                  {listing.title}
                </a>
                <span className="block">
                  {money(listing)} · {listing.source === "image" ? "Photo match" : "Title search"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {lookups.length > 1 ? (
        <div className="mt-5">
          <h3 className="text-sm">Earlier lookups</h3>
          <ul className="mt-2 flex flex-col gap-2 text-sm">
            {lookups.slice(1, 6).map((lookup) => (
              <li key={lookup.id}>
                {formatWhen(lookup.created_at)} · {lookup.listings.length} asking prices
                {lookup.range ? ` · typical $${dollars(lookup.range.typical)}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
