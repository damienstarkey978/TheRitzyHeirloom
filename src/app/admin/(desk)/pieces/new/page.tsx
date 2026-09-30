import type { Metadata } from "next";
import { AddPieceForm } from "@/components/add-piece-form";
import { PageShell } from "@/components/ui";

export const metadata: Metadata = { title: "Add a piece" };

export default function NewPiecePage() {
  return (
    <PageShell
      title="Add a piece"
      lead="Take photos on your phone. A hidden draft is created as soon as they upload."
    >
      <AddPieceForm />
    </PageShell>
  );
}
