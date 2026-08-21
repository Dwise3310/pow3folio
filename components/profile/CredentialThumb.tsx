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
  const fillId = `docFill-${doc.id}`;

  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 120 158" className="h-full w-full" aria-hidden>
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f5e6c8" />
            <stop offset="100%" stopColor="#c4a574" />
          </linearGradient>
        </defs>
        <path
          d="M10 6h68l36 36v100a10 10 0 0 1-10 10H10A10 10 0 0 1 0 142V16A10 10 0 0 1 10 6z"
          fill={`url(#${fillId})`}
        />
        <path d="M78 6v30a6 6 0 0 0 6 6h30" fill="#e8d5a8" />
        <path d="M78 6l36 36" fill="none" stroke="#8a6a32" strokeWidth="1.4" opacity="0.45" />
        <path d="M22 78h76M22 92h64M22 106h52" stroke="#6b4f24" strokeWidth="3.2" strokeLinecap="round" opacity="0.35" />
      </svg>
      <span className="absolute bottom-[12%] left-1/2 -translate-x-1/2 rounded-full bg-amber-900/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-50">
        {kind}
      </span>
    </div>
  );
}
