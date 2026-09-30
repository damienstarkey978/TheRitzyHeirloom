import Link from "next/link";

export default function NotFound() {
  return (
    <main className="px-4 py-16 text-center">
      <h1 className="text-2xl">That page is not on the floor.</h1>
      <Link href="/shop" className="mt-6 inline-flex min-h-11 items-center text-sm underline hover:text-gold">
        Back to the shop
      </Link>
    </main>
  );
}
