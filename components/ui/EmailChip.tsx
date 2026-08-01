"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  email: string;
};

export default function EmailChip({ email }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-border bg-surface-elevated px-2.5 py-1 text-xs font-medium transition-all hover:border-primary/40 hover:text-primary"
      >
        Email
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[11rem] overflow-hidden rounded-lg border border-border bg-surface shadow-lg animate-fade-in">
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-xs hover:bg-surface-hover"
            onClick={() => {
              void copy();
            }}
          >
            {copied ? "Copied!" : "Copy email"}
          </button>
          <a
            href={`mailto:${email}`}
            className="block w-full px-3 py-2 text-left text-xs hover:bg-surface-hover border-t border-border"
            onClick={() => setOpen(false)}
          >
            Open mail app
          </a>
          <p className="border-t border-border px-3 py-1.5 text-[10px] text-foreground-subtle truncate">
            {email}
          </p>
        </div>
      )}
    </div>
  );
}
