import Image from "next/image";

export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-5 py-16 sm:px-10 sm:py-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-3 border border-gold sm:inset-6"
      />
      <h1 className="sr-only">The Ritzy Heirloom</h1>
      <Image
        src="/logo.jpg"
        alt="The Ritzy Heirloom"
        width={1499}
        height={468}
        priority
        className="h-auto w-full max-w-3xl"
      />
      <div aria-hidden="true" className="mt-8 h-px w-12 bg-gold sm:mt-10 sm:w-16" />
      <p className="mt-6 max-w-xs text-center text-base leading-7 tracking-wide text-black sm:mt-8 sm:max-w-md sm:text-lg">
        An antique shop in Neptune Beach, Florida.
      </p>
    </main>
  );
}
