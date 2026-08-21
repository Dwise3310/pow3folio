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
    <div className={`flex items-center justify-center bg-transparent ${className}`}>
      <div className="relative w-[58%] max-w-[7.5rem] aspect-[3/4] rounded-[3px] rounded-tr-[22px] bg-gradient-to-br from-amber-50 to-stone-200 shadow-[0_8px_18px_rgba(0,0,0,0.18)] dark:from-zinc-200 dark:to-zinc-400">
        <span className="absolute top-0 right-0 h-[22%] w-[28%] rounded-bl-md bg-gradient-to-br from-amber-200 to-stone-400 dark:from-zinc-100 dark:to-zinc-500" />
        <span className="absolute top-[22%] right-0 h-px w-[28%] bg-stone-400/70" />
        <div className="absolute inset-x-[14%] top-[30%] space-y-1.5">
          <span className="block h-1 rounded-full bg-stone-500/35 dark:bg-zinc-700/40" />
          <span className="block h-1 w-[88%] rounded-full bg-stone-500/30 dark:bg-zinc-700/35" />
          <span className="block h-1 w-[70%] rounded-full bg-stone-500/25 dark:bg-zinc-700/30" />
        </div>
        <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-800 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-amber-50">
          {kind}
        </span>
      </div>
    </div>
  );
}
