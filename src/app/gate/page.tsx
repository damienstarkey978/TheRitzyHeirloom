import type { Metadata } from "next";
import { CsrfField } from "@/components/csrf-field";
import { Field, PageShell, SubmitButton } from "@/components/ui";
import { sitePassword } from "@/lib/config";

export const metadata: Metadata = { title: "Private preview" };

export default async function GatePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const query = await searchParams;
  const next = query.next && query.next.startsWith("/") && !query.next.startsWith("//") ? query.next : "/";
  if (!sitePassword()) {
    return (
      <PageShell title="Private preview" lead="This computer is not asking for a site password.">
        <p className="mt-6 max-w-lg text-sm leading-6">
          Set SITE_PASSWORD on the host when this shop should stay closed until that password is entered.
        </p>
      </PageShell>
    );
  }
  return (
    <PageShell title="Private preview" lead="This shop is not public. Enter the site password to continue.">
      <form action="/api/gate" method="post" className="mt-8 flex max-w-sm flex-col gap-4">
        <CsrfField />
        <input type="hidden" name="next" value={next} />
        <Field label="Site password" name="password" type="password" autoComplete="current-password" required />
        {query.error ? (
          <p role="alert" className="border border-black px-3 py-2 text-sm">
            That password did not match.
          </p>
        ) : null}
        <SubmitButton>Continue</SubmitButton>
      </form>
    </PageShell>
  );
}
