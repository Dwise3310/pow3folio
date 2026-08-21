"use client";

import { credentialKind } from "@/lib/credentials";
import type { Credential } from "@/types/database";

export default function CredentialThumb({
  doc,
  className = "",
}: {
  doc: Credential;
  className?: string;
}) {
  const kind = credentialKind(doc);

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-amber-50 to-stone-100 dark:from-zinc-800 dark:to-zinc-900 ${className}`}
    >
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-3 py-4 text-center">
        <svg viewBox="0 0 48 56" className="h-10 w-8 text-amber-700/80 dark:text-amber-300/70" aria-hidden>
          <path
            fill="currentColor"
            d="M8 2h22l12 12v38a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4z"
            opacity="0.18"
          />
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            d="M29 2.8V14h11.2M8 2h21l12 12v38a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4z"
          />
          <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M14 28h20M14 35h16M14 42h12" />
        </svg>
        <span className="rounded-full border border-amber-700/30 bg-amber-700/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:border-amber-300/30 dark:bg-amber-300/10 dark:text-amber-300">
          {kind}
        </span>
        <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-foreground">{doc.title}</p>
        {doc.issuer && <p className="line-clamp-1 text-[10px] text-foreground-subtle">{doc.issuer}</p>}
      </div>
    </div>
  );
}
