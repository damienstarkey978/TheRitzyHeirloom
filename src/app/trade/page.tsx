import type { Metadata } from "next";
import { Field, PageShell, SaveHint, SavedNote, SubmitButton, TextArea, fieldClass } from "@/components/ui";
import { PROJECT_TYPES } from "@/lib/store";

export const metadata: Metadata = { title: "Trade" };

export default async function TradePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const query = await searchParams;
  return (
    <PageShell
      title="Fabric and wallpaper samples"
      lead="A request for antique French fabrics and wallpapers. Say what the project is."
    >
      <form action="/api/submissions" method="post" className="mt-8 flex max-w-lg flex-col gap-4">
        <input type="hidden" name="kind" value="trade" />
        <input type="hidden" name="return_to" value="/trade" />
        <Field label="Name" name="name" required autoComplete="name" />
        <Field label="Email" name="email" type="email" required autoComplete="email" />
        <label className="block">
          <span className="text-[0.65rem] tracking-[0.16em] uppercase">Project type</span>
          <select name="project_type" required className={fieldClass} defaultValue="">
            <option value="" disabled>
              Choose one
            </option>
            {PROJECT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <TextArea
          label="What are you looking for?"
          name="message"
          required
          placeholder="Fabrics, wallpapers, colors, or the room"
        />
        <SaveHint />
        <SavedNote saved={query.saved} error={query.error} />
        <SubmitButton>Request samples</SubmitButton>
      </form>
    </PageShell>
  );
}
