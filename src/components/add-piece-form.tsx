"use client";

import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { createPieceFromPhotos } from "@/app/admin/actions";
import { buttonClass } from "@/components/styles";

function PendingNote() {
  const { pending } = useFormStatus();
  if (!pending) return null;
  return <p className="mt-4 text-sm">Saving the photos…</p>;
}

export function AddPieceForm({ csrfToken }: { csrfToken: string }) {
  const [state, action] = useActionState(createPieceFromPhotos, { error: "" });
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form action={action} ref={formRef} className="mt-6">
      <input type="hidden" name="csrf" value={csrfToken} />
      <label className="flex min-h-[58dvh] cursor-pointer flex-col items-center justify-center border border-gold px-6 py-10 text-center">
        <input
          type="file"
          name="photos"
          accept="image/*"
          capture="environment"
          multiple
          className="sr-only"
          onChange={() => formRef.current?.requestSubmit()}
        />
        <span className="text-[0.7rem] tracking-[0.2em] uppercase">Take photos</span>
        <span className="mt-3 max-w-xs text-sm leading-6">
          Opens the camera. Take several. Saving starts when the photos are chosen, and the draft
          stays off the shop floor until you publish it.
        </span>
        <PendingNote />
      </label>
      {state.error ? (
        <p role="alert" className="mt-4 border border-black px-3 py-2 text-sm">
          {state.error}
        </p>
      ) : null}
      <button type="submit" className={`${buttonClass} mt-4 w-full sm:w-auto`}>
        Save photos as a draft
      </button>
    </form>
  );
}
