import Link from "next/link";

export default function NotFound() {
  return (
    <main className="px-4 py-16 text-center">
      <h1 className="text-2xl">That page is not on the floor.</h1>
      <Link href="/shop" className="mt-6 inline-block text-[0.7rem] tracking-[0.16em] uppercase hover:text-gold">
        Back to the shop
      </Link>
    </main>
  );
}
