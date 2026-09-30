import type { Metadata } from "next";
import { PageShell, SubmitButton, Field } from "@/components/ui";

export const metadata: Metadata = { title: "Shop desk" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  return (
    <PageShell title="Shop desk" lead="Sign in to add pieces and read notes.">
      <form action="/api/admin/login" method="post" className="mt-8 flex max-w-sm flex-col gap-4">
        <Field label="Username" name="username" autoComplete="username" required />
        <Field label="Password" name="password" type="password" autoComplete="current-password" required />
        {query.error ? (
          <p role="alert" className="border border-black px-3 py-2 text-sm">
            That sign-in did not match.
          </p>
        ) : null}
        <SubmitButton>Sign in</SubmitButton>
      </form>
    </PageShell>
  );
}
