import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/ui";
import { formatCostMicros } from "@/lib/estimate";
import { aiConfigured } from "@/lib/research";
import { listAllPieces, lookupCostMicrosSince, shopPeriodStart, submissionCount } from "@/lib/store";

export const metadata: Metadata = { title: "Shop desk" };

export default function DeskHomePage() {
  const notes = submissionCount();
  const pieces = listAllPieces();
  const monthCost = lookupCostMicrosSince(shopPeriodStart("month"));
  const drafts = pieces.filter((piece) => piece.status === "draft").length;
  const onFloor = pieces.filter((piece) => piece.status === "available").length;
  return (
    <PageShell
      title="Shop desk"
      lead="Add a piece, open the inventory, or read notes from the shop forms."
    >
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Link
          href="/admin/pieces/new"
          className="flex min-h-36 flex-col justify-between bg-gold px-5 py-6 text-white"
        >
          <span className="text-2xl">Add piece</span>
          <span className="text-sm leading-6 text-white/90">Take photos and start a draft. It stays off the floor until you publish it.</span>
        </Link>
        <Link
          href="/admin/pieces"
          className="flex min-h-36 flex-col justify-between border border-gold px-5 py-6"
        >
          <span className="text-2xl">Pieces</span>
          <span className="text-sm leading-6">
            {pieces.length === 0
              ? "Nothing in the inventory yet."
              : `${drafts} draft${drafts === 1 ? "" : "s"} · ${onFloor} on the floor.`}
          </span>
        </Link>
        <Link
          href="/admin/inbox"
          className="flex min-h-36 flex-col justify-between border border-gold px-5 py-6"
        >
          <span className="text-2xl">Inbox</span>
          <span className="text-sm leading-6">
            {notes === 0 ? "No notes yet." : `${notes} note${notes === 1 ? "" : "s"} from the shop forms.`}
          </span>
        </Link>
      </div>
      <p className="mt-6 text-sm leading-6">
        {aiConfigured()
          ? `AI lookups this month: ${formatCostMicros(monthCost)}.`
          : "AI lookup is not set up."}
      </p>
    </PageShell>
  );
}
