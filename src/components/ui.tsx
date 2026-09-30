import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { formatPrice, type PieceCard } from "@/lib/store";

const basePath = process.env.PAGES_BASE_PATH ?? "";

export const fieldClass =
  "mt-1 w-full border border-black/30 bg-white px-3 py-2 text-base text-black outline-none focus:border-gold";

export const buttonClass =
  "inline-block border border-gold bg-white px-4 py-3 text-center text-[0.7rem] tracking-[0.18em] text-black uppercase hover:bg-gold hover:text-white disabled:opacity-60";

export const quietButtonClass =
  "inline-block border border-black/30 bg-white px-3 py-2 text-[0.65rem] tracking-[0.14em] text-black uppercase disabled:opacity-40";

export function PageShell({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <main className="relative px-4 py-6 sm:px-8 sm:py-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-3 border border-gold sm:inset-5" />
      <div className="relative mx-auto w-full max-w-5xl pb-10">
        <Link href="/" className="inline-block">
          <Image
            src={`${basePath}/logo.jpg`}
            alt="The Ritzy Heirloom"
            width={1499}
            height={468}
            className="h-auto w-36 sm:w-48"
          />
        </Link>
        <div aria-hidden="true" className="mt-3 h-px w-10 bg-gold" />
        <h1 className="mt-6 text-2xl sm:text-3xl">{title}</h1>
        {lead ? <p className="mt-3 max-w-2xl text-sm leading-6 sm:text-base sm:leading-7">{lead}</p> : null}
        {children}
      </div>
    </main>
  );
}

export function Field({
  label,
  name,
  type = "text",
  required = false,
  autoComplete,
  placeholder,
  defaultValue,
  inputMode,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  defaultValue?: string;
  inputMode?: "decimal" | "email" | "text";
}) {
  return (
    <label className="block">
      <span className="text-[0.65rem] tracking-[0.16em] uppercase">{label}</span>
      <input
        className={fieldClass}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        defaultValue={defaultValue}
        inputMode={inputMode}
      />
    </label>
  );
}

export function TextArea({
  label,
  name,
  required = false,
  placeholder,
  defaultValue,
  rows = 5,
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="text-[0.65rem] tracking-[0.16em] uppercase">{label}</span>
      <textarea
        className={fieldClass}
        name={name}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        rows={rows}
      />
    </label>
  );
}

export function SubmitButton({ children }: { children: ReactNode }) {
  return (
    <button type="submit" className={buttonClass}>
      {children}
    </button>
  );
}

export function SaveHint() {
  return (
    <p className="text-sm leading-6 text-black/80">This is saved for the shop desk. Nothing is emailed.</p>
  );
}

export function SavedNote({ saved, error }: { saved?: string; error?: string }) {
  if (saved) {
    return (
      <p role="status" className="mt-4 border border-gold px-3 py-2 text-sm">
        Saved for the shop desk. Nothing was emailed.
      </p>
    );
  }
  if (!error) return null;
  const copy: Record<string, string> = {
    email: "Enter an email address.",
    name: "Enter your name.",
    message: "Write a short note.",
    time: "Enter a time that suits you.",
    project: "Choose a project type.",
    photo: "That photo could not be saved. Try a JPEG or PNG.",
    piece: "That piece is not available for this note.",
    kind: "Choose what you need.",
  };
  return (
    <p role="alert" className="mt-4 border border-black px-3 py-2 text-sm">
      {copy[error] ?? "Check the form and try again."}
    </p>
  );
}

export function SampleBanner() {
  return (
    <p className="mt-4 border border-gold px-3 py-2 text-sm leading-6">
      Pieces marked Sample data are demonstration listings for this private preview. They are not in
      the shop, and they do not have real prices.
    </p>
  );
}

export function PieceCard({ piece, large = false }: { piece: PieceCard; large?: boolean }) {
  const aspect = large ? "aspect-[4/5]" : "aspect-[4/3]";
  return (
    <li>
      <Link href={`/pieces/${piece.id}`} className="group block">
        <div className="relative">
          {piece.cover ? (
            // Photos are resized files served by this app, not static imports.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/media/${piece.cover}`}
              alt={piece.is_sample ? `Sample image for ${piece.title}` : piece.title}
              className={`${aspect} w-full object-cover`}
            />
          ) : (
            <div className={`${aspect} flex items-center justify-center border border-gold`}>
              <span className="text-[0.65rem] tracking-[0.16em] uppercase">No photo yet</span>
            </div>
          )}
          {piece.sold ? (
            <span className="absolute top-2 left-2 bg-white px-2 py-1 text-[0.65rem] tracking-[0.16em] text-gold uppercase">
              Sold
            </span>
          ) : null}
          {piece.is_sample ? (
            <span className="absolute top-2 right-2 bg-white px-2 py-1 text-[0.65rem] tracking-[0.16em] uppercase">
              Sample data
            </span>
          ) : null}
        </div>
        <h2 className="mt-3 text-lg group-hover:text-gold">{piece.title}</h2>
        <p className="text-sm">{formatPrice(piece)}</p>
        {large && piece.story ? <p className="mt-2 text-sm leading-6 text-black/80">{piece.story}</p> : null}
      </Link>
    </li>
  );
}
