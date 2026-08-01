"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  email: string;
};

export default function EmailChip({ email }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    function place() {
      if (!ref.current) return;
      const r = ref.current.getBoundingClientRect();
      const menuWidth = 176;
      const left = Math.min(
        Math.max(8, r.left),
        window.innerWidth - menuWidth - 8
      );
      setPos({ top: r.bottom + 6, left });
    }

    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);

    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) {
        const menu = document.getElementById("email-chip-menu");
        if (menu && menu.contains(e.target as Node)) return;
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onDoc);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
      document.removeEventListener("mousedown", onDoc);
    };
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

  const menu =
    open && mounted
      ? createPortal(
          <div
            id="email-chip-menu"
            className="fixed z-[99999] min-w-[11rem] overflow-hidden rounded-lg border border-border bg-surface shadow-xl animate-fade-in"
            style={{ top: pos.top, left: pos.left }}
          >
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
              className="block w-full border-t border-border px-3 py-2 text-left text-xs hover:bg-surface-hover"
              onClick={() => setOpen(false)}
            >
              Open mail app
            </a>
            <p className="border-t border-border px-3 py-1.5 text-[10px] text-foreground-subtle truncate">
              {email}
            </p>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-border bg-surface-elevated px-2.5 py-1 text-xs font-medium transition-all hover:border-primary/40 hover:text-primary"
      >
        Email
      </button>
      {menu}
    </div>
  );
}
