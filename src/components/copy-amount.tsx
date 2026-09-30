"use client";

import { useState } from "react";
import { quietButtonClass } from "@/components/styles";
import { dollars } from "@/lib/value";

export function CopyAmount({ label, cents }: { label: string; cents: number }) {
  const [copied, setCopied] = useState(false);
  const amount = dollars(cents);
  return (
    <button
      type="button"
      className={`${quietButtonClass} min-h-11`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(amount);
          setCopied(true);
        } catch {
          setCopied(false);
        }
      }}
    >
      {label} ${amount}
      {copied ? " · copied" : ""}
    </button>
  );
}
