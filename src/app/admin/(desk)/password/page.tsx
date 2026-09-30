import type { Metadata } from "next";
import { CsrfField } from "@/components/csrf-field";
import { Field, PageShell, SubmitButton } from "@/components/ui";
import { changePasswordAction } from "@/app/admin/actions";

export const metadata: Metadata = { title: "Desk password" };

const errors: Record<string, string> = {
  current: "The current password did not match.",
  short: "Use at least 10 characters.",
  same: "Choose a different password.",
  confirm: "The new passwords did not match.",
  form: "This page expired. Reload it and try again.",
};

export default async function PasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const query = await searchParams;
  return (
    <PageShell
      title="Desk password"
      lead="This changes the shop desk sign-in. The environment password is only used when the account is first created."
    >
      <form action={changePasswordAction} className="mt-8 flex max-w-sm flex-col gap-4">
        <CsrfField />
        <Field label="Current password" name="current" type="password" autoComplete="current-password" required />
        <Field label="New password" name="next" type="password" autoComplete="new-password" required />
        <Field label="Confirm new password" name="confirm" type="password" autoComplete="new-password" required />
        {query.saved ? (
          <p role="status" className="border border-gold px-3 py-2 text-sm">
            Password saved.
          </p>
        ) : null}
        {query.error ? (
          <p role="alert" className="border border-black px-3 py-2 text-sm">
            {errors[query.error] ?? "Check the form and try again."}
          </p>
        ) : null}
        <SubmitButton>Save password</SubmitButton>
      </form>
    </PageShell>
  );
}
