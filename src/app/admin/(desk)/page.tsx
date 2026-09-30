import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/ui";
import { formatWhen, listSubmissions, SUBMISSION_LABELS } from "@/lib/store";

export const metadata: Metadata = { title: "Inbox" };

export default function InboxPage() {
  const notes = listSubmissions();
  return (
    <PageShell title="Inbox" lead="Notes from the shop forms. Nothing here was emailed.">
      {notes.length === 0 ? (
        <p className="mt-8 text-sm leading-6">
          No notes yet. Questions, holds, visits, trade requests, consignments, and new-arrival
          signups will land here.
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {notes.map((note) => (
            <li key={note.id} className="border border-black/15 p-4">
              <p className="text-[0.65rem] tracking-[0.16em] text-gold uppercase">
                {SUBMISSION_LABELS[note.kind] ?? note.kind}
              </p>
              <h2 className="mt-2 text-lg">{note.name || note.email}</h2>
              {note.name ? <p className="text-sm">{note.email}</p> : null}
              {note.piece_id ? (
                <p className="mt-2 text-sm">
                  About{" "}
                  <Link href={`/admin/pieces/${note.piece_id}`} className="underline hover:text-gold">
                    {note.piece_title ?? "a piece"}
                  </Link>
                </p>
              ) : null}
              {note.project_type ? <p className="mt-2 text-sm">Project: {note.project_type}</p> : null}
              {note.preferred_time ? <p className="mt-2 text-sm">Time: {note.preferred_time}</p> : null}
              {note.message ? <p className="mt-3 text-sm leading-6 whitespace-pre-wrap">{note.message}</p> : null}
              {note.photos.length > 0 ? (
                <ul className="mt-3 flex flex-col gap-3">
                  {note.photos.map((photo) => (
                    <li key={photo.id}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/media/${photo.filename}`}
                        alt="Photo sent with this note"
                        className="max-h-80 w-full object-contain"
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="mt-3 text-sm text-black/60">{formatWhen(note.created_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
