import Link from "next/link";

const links = [
  ["/shop", "Shop"],
  ["/arrivals", "New arrivals"],
  ["/sold", "Sold shelf"],
  ["/visit", "Visit"],
  ["/trade", "Trade"],
  ["/consign", "Consign"],
  ["/admin", "Shop desk"],
] as const;

export function SiteHeader() {
  return (
    <header className="border-b border-gold">
      <nav
        aria-label="Shop"
        className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-3 sm:justify-end sm:gap-x-5 sm:px-8"
      >
        {links.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className="text-[0.65rem] tracking-[0.16em] text-black uppercase hover:text-gold"
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
