"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const QUICK = [
  "How do I improve my profile?",
  "What is Profile Score vs Builder Score?",
  "Help me write a short bio",
  "How do I add work experience?",
  "Where is View talents?",
];

type Props = {
  /** Optional snapshot string for personalization */
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
        "I am Pow3Bot. I help with Pow3Folio only: profile setup, proof of work, scores, and discovery. Ask anything about this product.",
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, loading]);

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
        setMessages([...next, { role: "assistant", content: data.reply || "…" }]);
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

  return (
    <>
      {/* Launcher */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-[80] flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface shadow-lg transition hover:border-primary/40 hover:shadow-glow-sm sm:bottom-6 sm:right-6"
        aria-label={open ? "Close Pow3Bot" : "Open Pow3Bot"}
      >
        {open ? (
          <span className="text-lg leading-none">×</span>
        ) : (
          <span className="text-xs font-bold text-primary">AI</span>
        )}
      </button>

      {open && (
        <div className="fixed bottom-20 right-3 z-[80] flex w-[min(100vw-1.5rem,22rem)] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-xl sm:bottom-24 sm:right-6">
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <div>
              <p className="text-sm font-semibold">Pow3Bot</p>
              <p className="text-[10px] text-foreground-subtle">Pow3Folio assistant</p>
            </div>
            <button
              type="button"
              className="btn-ghost text-xs px-2"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>

          <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto p-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`rounded-xl px-2.5 py-2 text-xs leading-relaxed ${
                  m.role === "user"
                    ? "ml-6 bg-primary/15 text-foreground"
                    : "mr-4 bg-surface-elevated text-foreground-muted"
                }`}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <p className="text-[11px] text-foreground-subtle">Thinking…</p>
            )}
            <div ref={bottomRef} />
          </div>

          {!loading && messages.length < 4 && (
            <div className="flex flex-wrap gap-1.5 border-t border-border px-3 py-2">
              {QUICK.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  className="rounded-full border border-border px-2 py-1 text-[10px] text-foreground-muted hover:border-primary/30 hover:text-primary"
                >
                  {q}
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
              placeholder="Ask about Pow3Folio…"
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
          {error && (
            <p className="px-3 pb-2 text-[10px] text-danger">{error}</p>
          )}
        </div>
      )}
    </>
  );
}
