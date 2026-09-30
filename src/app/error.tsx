"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="px-4 py-16 text-center">
      <h1 className="text-2xl">This page could not be opened.</h1>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 border border-gold px-4 py-3 text-[0.7rem] tracking-[0.18em] uppercase"
      >
        Try again
      </button>
    </main>
  );
}
