import Link from "next/link";

const links = [
  ["/shop", "Shop", "Shop"],
  ["/arrivals", "New arrivals", "New"],
  ["/sold", "Sold shelf", "Sold"],
  ["/visit", "Visit", "Visit"],
  ["/trade", "Trade", "Trade"],
  ["/consign", "Consign", "Consign"],
  ["/admin", "Shop desk", "Desk"],
] as const;

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 bottom-0 z-30 border-t border-gold bg-white md:sticky md:top-0 md:bottom-auto md:border-t-0 md:border-b">
      <nav
        aria-label="Shop"
        className="mx-auto grid max-w-5xl grid-cols-4 md:flex md:flex-wrap md:justify-end md:gap-1 md:px-6"
      >
        {links.map(([href, label, short]) => (
          <Link
            key={href}
            href={href}
            className="flex min-h-11 items-center justify-center px-2 text-center text-sm text-black hover:text-gold"
          >
            <span className="md:hidden">{short}</span>
            <span className="hidden md:inline">{label}</span>
          </Link>
        ))}
      </nav>
    </header>
  );
}
