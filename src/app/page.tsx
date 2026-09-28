import Image from "next/image";

const offerings = [
  {
    title: "Curated Antiques & Vintage Finds",
    text: "Distinctive pieces with character, craftsmanship, and history, from decorative objects and furnishings to collectible treasures that bring personality to a home.",
  },
  {
    title: "Vintage Jewelry",
    text: "Unique vintage jewelry chosen for its beauty, design, and individuality — pieces meant to be worn, gifted, and treasured again.",
  },
  {
    title: "Fine Art",
    text: "Artwork selected to make a room feel collected rather than decorated, including distinctive European and vintage works.",
  },
  {
    title: "European & English Pieces",
    text: "European and English antiques and decorative finds that add old-world character to modern interiors.",
  },
  {
    title: "Antique French Fabrics & Wallpapers",
    text: "Historic textiles and wallpapers for designers, collectors, and homeowners, with authentic pattern, texture, and history.",
  },
  {
    title: "One-of-a-Kind Treasures",
    text: "A shop about discovery. Each piece is chosen for its beauty, character, craftsmanship, and history — elevated, yet inviting.",
  },
] as const;

export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-col px-4 py-6 sm:px-8 sm:py-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-3 border border-gold sm:inset-5"
      />
      <div className="m-auto flex w-full max-w-5xl flex-col items-center">
        <h1 className="sr-only">The Ritzy Heirloom</h1>
        <Image
          src="/logo.jpg"
          alt="The Ritzy Heirloom"
          width={1499}
          height={468}
          priority
          className="h-auto w-full max-w-[16.5rem] sm:max-w-lg"
        />
        <p className="mt-2 text-center text-xs tracking-[0.18em] text-black uppercase sm:mt-3 sm:text-sm">
          Neptune Beach, Florida
        </p>
        <div aria-hidden="true" className="mt-3 h-px w-10 bg-gold sm:mt-4 sm:w-12" />
        <p className="mt-3 max-w-2xl text-center text-[0.8125rem] leading-5 text-black sm:mt-4 sm:text-base sm:leading-6">
          A beautifully designed boutique shop filled with antiques, vintage finds,
          fine art, European and English pieces, antique French fabrics and
          wallpapers, and one-of-a-kind treasures.
        </p>
        <section aria-labelledby="what-we-do" className="mt-4 w-full sm:mt-5">
          <h2
            id="what-we-do"
            className="text-center text-[0.65rem] tracking-[0.22em] text-black uppercase sm:text-xs"
          >
            What we do
          </h2>
          <ul className="mt-3 grid gap-x-8 gap-y-2.5 sm:mt-4 sm:grid-cols-2 sm:gap-y-3 lg:grid-cols-3">
            {offerings.map((offering) => (
              <li key={offering.title}>
                <h3 className="text-[0.8125rem] leading-5 text-black sm:text-sm">
                  {offering.title}
                </h3>
                <p className="mt-0.5 text-[0.75rem] leading-4 text-black/80 sm:text-[0.8125rem] sm:leading-5">
                  {offering.text}
                </p>
              </li>
            ))}
          </ul>
        </section>
        <p className="mt-4 text-center text-[0.65rem] tracking-[0.16em] text-black uppercase sm:mt-5 sm:text-xs">
          Browse. Discover. Take a little history home.
        </p>
      </div>
    </main>
  );
}
