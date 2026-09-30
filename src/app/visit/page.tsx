import type { Metadata } from "next";
import { Field, PageShell, SaveHint, SavedNote, SubmitButton, TextArea } from "@/components/ui";

export const metadata: Metadata = { title: "Private visit" };

export default async function VisitPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const query = await searchParams;
  return (
    <PageShell
      title="A private visit"
      lead="Request a time to come in. Hours are not published."
    >
      <form action="/api/submissions" method="post" className="mt-8 flex max-w-lg flex-col gap-4">
        <input type="hidden" name="kind" value="visit" />
        <input type="hidden" name="return_to" value="/visit" />
        <Field label="Name" name="name" required autoComplete="name" />
        <Field label="Email" name="email" type="email" required autoComplete="email" />
        <Field
          label="A time that suits you"
          name="preferred_time"
          required
          placeholder="A day and a time"
        />
        <TextArea label="Note" name="message" placeholder="Anything we should know" />
        <SaveHint />
        <SavedNote saved={query.saved} error={query.error} />
        <SubmitButton>Request a visit</SubmitButton>
      </form>
    </PageShell>
  );
}
