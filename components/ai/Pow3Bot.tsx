"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type Msg = { role: "user" | "assistant"; content: string };

const QUICK = [
  "Analyse my profile and list shortfalls",
  "Help me rewrite my short bio",
  "What is Profile Score vs Builder Score?",
  "Diff mode: improve text I paste next",
  "Where is the FAQ?",
];

function stripMd(s: string) {
  return s
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "");
}

type Props = {
  context?: string;
};

export default function Pow3Bot({ context }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hey. I'm Pow3Bot, here for Pow3Folio only. Ask about your profile, scores, proof sections, or paste rough text and I'll clean it up. If you're logged in, I can see your profile and be honest about the gaps.",
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Session only drag position (resets on full page refresh)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{
    active: boolean;
    moved: boolean;
    ox: number;
    oy: number;
    sx: number;
    sy: number;
  } | null>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, loading]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    drag.current = {
      active: true,
      moved: false,
      ox: e.clientX - rect.left,
      oy: e.clientY - rect.top,
      sx: e.clientX,
      sy: e.clientY,
    };
    el.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d?.active) return;
    if (Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) > 6) d.moved = true;
    if (!d.moved) return;
    const size = 48;
    const x = Math.max(8, Math.min(window.innerWidth - size - 8, e.clientX - d.ox));
    const y = Math.max(8, Math.min(window.innerHeight - size - 8, e.clientY - d.oy));
    setPos({ x, y });
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    d.active = false;
    if (!d.moved) setOpen((v) => !v);
    drag.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    setError(null);
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, context }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not reach Pow3Bot");
        setMessages([
          ...next,
          {
            role: "assistant",
            content: data.error || "Something went wrong. Try again in a moment.",
          },
        ]);
      } else {
        setMessages([
          ...next,
          { role: "assistant", content: stripMd(data.reply || "…") },
        ]);
      }
    } catch {
      setError("Network error");
      setMessages([
        ...next,
        { role: "assistant", content: "Network error. Check your connection." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const btnStyle: React.CSSProperties = pos
    ? { left: pos.x, top: pos.y, right: "auto", bottom: "auto" }
    : {};

  const panelStyle: React.CSSProperties = pos
    ? {
        left: Math.min(pos.x, typeof window !== "undefined" ? window.innerWidth - 360 : pos.x),
        bottom: typeof window !== "undefined" ? window.innerHeight - pos.y + 8 : 80,
        right: "auto",
        top: "auto",
      }
    : {};

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[75] bg-black/50 backdrop-blur-[2px]"
          aria-hidden
          onClick={() => setOpen(false)}
        />
      )}

      <button
        type="button"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={btnStyle}
        className={`fixed z-[80] flex h-12 w-12 touch-none items-center justify-center rounded-full border-2 border-primary/50 bg-surface shadow-lg shadow-primary/25 ring-2 ring-primary/30 ring-offset-2 ring-offset-background transition hover:border-primary hover:shadow-primary/40 ${
          pos ? "" : "bottom-4 right-4 sm:bottom-6 sm:right-6"
        }`}
        aria-label={open ? "Close Pow3Bot" : "Open Pow3Bot"}
      >
        {open ? (
          <span className="text-lg leading-none">×</span>
        ) : (
          <span className="text-xs font-bold text-primary">AI</span>
        )}
      </button>

      {open && (
        <div
          style={panelStyle}
          className={`fixed z-[80] flex w-[min(100vw-1.5rem,22rem)] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-xl ${
            pos ? "" : "bottom-20 right-3 sm:bottom-24 sm:right-6"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <div>
              <p className="text-sm font-semibold">Pow3Bot</p>
              <p className="text-[10px] text-foreground-subtle">Drag the button to move · tap outside to close</p>
            </div>
            <div className="flex items-center gap-1">
              <Link href="/faq" className="btn-ghost text-[10px] px-2" onClick={() => setOpen(false)}>
                FAQ
              </Link>
              <button type="button" className="btn-ghost text-xs px-2" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
          </div>

          <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto p-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`rounded-xl px-2.5 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "ml-6 bg-primary/15 text-foreground"
                    : "mr-4 bg-surface-elevated text-foreground-muted"
                }`}
              >
                {m.content}
              </div>
            ))}
            {loading && <p className="text-[11px] text-foreground-subtle">Thinking…</p>}
            <div ref={bottomRef} />
          </div>

          {!loading && messages.length < 5 && (
            <div className="flex flex-wrap gap-1.5 border-t border-border px-3 py-2">
              {QUICK.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  className="rounded-full border border-border px-2 py-1 text-[10px] text-foreground-muted hover:border-primary/30 hover:text-primary"
                >
                  {q.length > 42 ? q.slice(0, 40) + "…" : q}
                </button>
              ))}
            </div>
          )}

          <form
            className="flex gap-2 border-t border-border p-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              className="input flex-1 text-xs py-2"
              placeholder="Ask about your profile or paste text…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              maxLength={4000}
            />
            <button
              type="submit"
              className="btn-primary text-xs px-3 py-2"
              disabled={loading || !input.trim()}
            >
              Send
            </button>
          </form>
          {error && <p className="px-3 pb-2 text-[10px] text-danger">{error}</p>}
        </div>
      )}
    </>
  );
}
