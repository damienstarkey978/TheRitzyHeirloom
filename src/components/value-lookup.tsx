import { acceptLookupAction, lookupValueAction } from "@/app/admin/actions";
import { CopyAmount } from "@/components/copy-amount";
import { CsrfField } from "@/components/csrf-field";
import { buttonClass } from "@/components/styles";
import { cautiousClaim, formatCostMicros } from "@/lib/estimate";
import { formatPrice, formatWhen, type PieceFull, type PieceLookup } from "@/lib/store";
import type { ResearchLink } from "@/lib/research";
import { dollars } from "@/lib/value";

function money(listing: { priceCents: number | null; currency: string }) {
  if (listing.priceCents == null) return "Price not listed";
  if (listing.currency === "USD") return `$${dollars(listing.priceCents)}`;
  return `${listing.currency} ${dollars(listing.priceCents)}`;
}

function LinkList({ links }: { links: ResearchLink[] }) {
  if (links.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-col text-sm">
      {links.map((link) => (
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
  );
}

function AcceptField({
  pieceId,
  lookupId,
  field,
  label,
  text,
  links,
}: {
  pieceId: number;
  lookupId: number;
  field: "title" | "description" | "history";
  label: string;
  text: string;
  links: ResearchLink[];
}) {
  if (!text.trim()) return null;
  return (
    <div className="mt-4 border border-black/15 p-3">
      <p className="text-xs tracking-wide uppercase">Suggested, check before publishing</p>
      <h3 className="mt-2 text-base">{label}</h3>
      <p className="mt-2 text-sm leading-6 whitespace-pre-wrap">{text}</p>
      <LinkList links={links} />
      <form action={acceptLookupAction} className="mt-3">
        <CsrfField />
        <input type="hidden" name="id" value={pieceId} />
        <input type="hidden" name="lookup_id" value={lookupId} />
        <input type="hidden" name="field" value={field} />
        <button type="submit" className={`${buttonClass} w-full`}>
          Use this {label.toLowerCase()}
        </button>
      </form>
    </div>
  );
}

export function ValueLookup({
  piece,
  lookups,
}: {
  piece: PieceFull;
  lookups: PieceLookup[];
}) {
  const latest = lookups[0];
  const estimate = latest?.research.estimate;
  const research = latest?.research;
  return (
    <section className="mt-10 max-w-xl border border-gold p-4">
      <h2 className="text-lg">Look up value and history</h2>
      <p className="mt-2 text-sm leading-6">
        This estimates a range from sold prices when it can find them, then asking prices. It does not
        change the price you typed.
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
          <p className="text-sm leading-6">
            Suggested range, kept separate from your price ({formatPrice(piece)}). This is an estimate.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyAmount label="Low" cents={piece.estimate_low_cents ?? piece.estimate_typical_cents} />
            <CopyAmount label="Typical" cents={piece.estimate_typical_cents} />
            <CopyAmount label="High" cents={piece.estimate_high_cents ?? piece.estimate_typical_cents} />
          </div>
          <p className="mt-2 text-sm leading-6">Tap a number to copy it, then paste it into the price box if you want that price.</p>
          {estimate ? (
            <p className="mt-3 text-sm leading-6">
              {estimate.soldCount} sold · {estimate.webAskingCount} web asking · {estimate.ebayAskingCount} eBay asking.
              Confidence: {estimate.confidence}.
            </p>
          ) : null}
          {piece.estimate_note ? <p className="mt-3 text-sm leading-6">{piece.estimate_note}</p> : null}
        </div>
      ) : piece.estimate_note ? (
        <p className="mt-4 text-sm leading-6">{piece.estimate_note}</p>
      ) : null}

      {research?.note ? <p className="mt-4 text-sm leading-6">{research.note}</p> : null}
      {latest && latest.costMicros > 0 ? (
        <p className="mt-3 text-sm leading-6">
          About {formatCostMicros(latest.costMicros)} for this lookup
          {latest.searchCount ? `, ${latest.searchCount} web search${latest.searchCount === 1 ? "" : "es"}` : ""}.
        </p>
      ) : null}

      {research && (research.maker || research.style || research.era || research.material || research.dimensions) ? (
        <div className="mt-4 text-sm leading-6">
          <h3 className="text-base">What this looks like</h3>
          {research.maker ? (
            <p className="mt-2">
              Maker: {cautiousClaim(research.maker, research.makerSourced, research.makerReason)}
            </p>
          ) : null}
          {research.style ? <p className="mt-1">Style: {research.style}</p> : null}
          {research.era ? (
            <p className="mt-1">Era: {cautiousClaim(research.era, research.eraSourced, research.eraReason)}</p>
          ) : null}
          {research.material ? <p className="mt-1">Material: {research.material}</p> : null}
          {research.dimensions ? <p className="mt-1">Dimensions: {research.dimensions}</p> : null}
          {research.confidence ? <p className="mt-2">Identification confidence: {research.confidence}.</p> : null}
        </div>
      ) : null}

      {latest && research ? (
        <>
          <AcceptField
            pieceId={piece.id}
            lookupId={latest.id}
            field="title"
            label="Title"
            text={research.title ?? ""}
            links={research.titleLinks ?? []}
          />
          <AcceptField
            pieceId={piece.id}
            lookupId={latest.id}
            field="description"
            label="Description"
            text={research.description}
            links={research.descriptionLinks ?? research.links}
          />
          <AcceptField
            pieceId={piece.id}
            lookupId={latest.id}
            field="history"
            label="History"
            text={research.history}
            links={research.historyLinks ?? research.links}
          />
        </>
      ) : null}

      {research && (research.comparables?.length ?? 0) > 0 ? (
        <div className="mt-5">
          <h3 className="text-sm">Web comparables</h3>
          <ul className="mt-3 flex flex-col gap-3">
            {research.comparables?.map((item) => (
              <li key={item.url} className="min-w-0 text-sm leading-6">
                <a
                  href={item.url}
                  className="flex min-h-11 items-center break-words underline hover:text-gold"
                  target="_blank"
                  rel="noreferrer"
                >
                  {item.title}
                </a>
                <span className="block">
                  {money({ priceCents: item.priceCents, currency: item.currency })} ·{" "}
                  {item.kind === "sold" ? "Sold or realized" : "Asking price"}
                  {item.date ? ` · ${item.date}` : ""} · {item.sourceName}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {latest && latest.listings.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-sm">eBay listings — asking prices, not sold prices</h3>
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
                {formatWhen(lookup.created_at)} · {lookup.listings.length} eBay asking prices
                {lookup.range ? ` · typical $${dollars(lookup.range.typical)}` : ""}
                {lookup.costMicros > 0 ? ` · ${formatCostMicros(lookup.costMicros)}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
