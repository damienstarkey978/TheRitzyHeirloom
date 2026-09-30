import type { Metadata } from "next";
import { CsrfField } from "@/components/csrf-field";
import { PageShell, PieceCard, SampleBanner, SavedNote, SaveHint, SubmitButton, Field } from "@/components/ui";
import { listArrivals } from "@/lib/store";

export const metadata: Metadata = { title: "New arrivals" };

export default async function ArrivalsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const query = await searchParams;
  const pieces = listArrivals();
  return (
    <PageShell
      title="New arrivals"
      lead="A lookbook of pieces recently put on the floor."
    >
      {pieces.some((piece) => piece.is_sample) ? <SampleBanner /> : null}
      <form action="/api/submissions" method="post" className="mt-6 flex max-w-md flex-col gap-4 border border-gold p-4">
        <CsrfField />
        <input type="hidden" name="kind" value="signup" />
        <input type="hidden" name="return_to" value="/arrivals" />
        <p className="text-sm leading-6">Leave an email for new arrivals. It is kept on the shop desk.</p>
        <Field label="Email" name="email" type="email" required autoComplete="email" />
        <SaveHint />
        <SavedNote saved={query.saved} error={query.error} />
        <SubmitButton>Save my email</SubmitButton>
      </form>
      {pieces.length === 0 ? (
        <p className="mt-8 text-sm">No new arrivals yet.</p>
      ) : (
        <ul className="mt-10 grid gap-10 sm:grid-cols-2">
          {pieces.map((piece) => (
            <PieceCard key={piece.id} piece={piece} large />
          ))}
        </ul>
      )}
    </PageShell>
  );
}
