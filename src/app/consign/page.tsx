import type { Metadata } from "next";
import { Field, PageShell, SaveHint, SavedNote, SubmitButton, TextArea } from "@/components/ui";

export const metadata: Metadata = { title: "Consign" };

export default async function ConsignPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const query = await searchParams;
  return (
    <PageShell title="Offer a piece" lead="Tell the shop about something you would like to consign.">
      <form
        action="/api/submissions"
        method="post"
        encType="multipart/form-data"
        className="mt-8 flex max-w-lg flex-col gap-4"
      >
        <input type="hidden" name="kind" value="consignment" />
        <input type="hidden" name="return_to" value="/consign" />
        <Field label="Name" name="name" required autoComplete="name" />
        <Field label="Email" name="email" type="email" required autoComplete="email" />
        <TextArea label="The piece" name="message" required placeholder="What it is, and anything you know about it" />
        <label className="block">
          <span className="text-[0.65rem] tracking-[0.16em] uppercase">Photo</span>
          <span className="mt-1 block text-sm leading-6">Optional.</span>
          <input className="mt-2 block w-full text-base" type="file" name="photo" accept="image/*" />
        </label>
        <SaveHint />
        <SavedNote saved={query.saved} error={query.error} />
        <SubmitButton>Offer this piece</SubmitButton>
      </form>
    </PageShell>
  );
}
