import type { Metadata } from "next";
import { AddPieceForm } from "@/components/add-piece-form";
import { PageShell } from "@/components/ui";
import { csrfValue } from "@/lib/request-csrf";

export const metadata: Metadata = { title: "Add a piece" };

export default async function NewPiecePage() {
  const csrfToken = await csrfValue();
  return (
    <PageShell
      title="Add a piece"
      lead="Take photos on your phone. A hidden draft is created as soon as they upload."
    >
      <AddPieceForm csrfToken={csrfToken} />
    </PageShell>
  );
}
