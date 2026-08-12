"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { searchPlatforms, getPlatformDomain } from "@/lib/cex-dex-list";
import type { TradingPlatform } from "@/types/database";

type Props = {
  userId: string;
  initial: TradingPlatform[];
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function TradingPlatformsManager({ userId, initial }: Props) {
  const router = useRouter();
  const [platforms, setPlatforms] = useState<TradingPlatform[]>(initial ?? []);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [link, setLink] = useState("");
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = searchPlatforms(query, 8);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  function pick(name: string) {
    setSelectedName(name);
    setQuery(name);
    setLink("");
  }

  async function save(next: TradingPlatform[]) {
    setSaving(true);
    setErr(null);
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ trading_platforms: next })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      setErr(error.message.includes("column")
        ? "Run the SQL migration for trading_platforms column first."
        : error.message);
      return;
    }
    setPlatforms(next);
    setMsg("Platforms saved");
    router.refresh();
  }

  function add() {
    if (!selectedName) return;
    if (platforms.length >= 4) {
      setErr("Max 4 platforms allowed");
      return;
    }
    if (platforms.some((p) => p.name.toLowerCase() === selectedName.toLowerCase())) {
      setErr("Already added");
      return;
    }
    const finalLink = link.trim() || getPlatformDomain(selectedName);
    const next = [
      ...platforms,
      { id: uid(), name: selectedName, link: finalLink },
    ];
    setOpen(false);
    setQuery("");
    setSelectedName(null);
    setLink("");
    save(next);
  }

  function remove(id: string) {
    const next = platforms.filter((p) => p.id !== id);
    save(next);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">CEX / DEX platforms</h2>
          <p className="text-xs text-foreground-muted">
            Platforms you trade on (max 4). Shown as chips under Trading Record.
          </p>
        </div>
        {!open && platforms.length < 4 && (
          <button
            type="button"
            className="btn-secondary text-sm shrink-0"
            onClick={() => {
              setOpen(true);
              setErr(null);
              setMsg(null);
            }}
          >
            Add CEX/DEX
          </button>
        )}
      </div>

      {platforms.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {platforms.map((p) => (
            <div
              key={p.id}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-elevated pl-2.5 pr-1.5 py-1.5 text-sm"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                {p.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="font-medium">{p.name}</span>
              <button
                type="button"
                onClick={() => remove(p.id)}
                className="ml-0.5 rounded-full p-0.5 text-foreground-subtle hover:text-danger"
                aria-label={`Remove ${p.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="rounded-xl border border-border bg-surface-elevated p-3 space-y-3 animate-fade-in">
          <p className="text-xs font-medium text-foreground-subtle">Search CEX / DEX</p>
          <div className="relative">
            <input
              ref={inputRef}
              className="input text-sm"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedName(null);
              }}
              placeholder="Type Bin, Byb, Hyp…"
              autoComplete="off"
            />
            {query.length >= 1 && !selectedName && suggestions.length > 0 && (
              <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg">
                {suggestions.map((s) => (
                  <li key={s.name}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-elevated"
                      onClick={() => pick(s.name)}
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {s.name.slice(0, 2).toUpperCase()}
                      </span>
                      {s.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {selectedName && (
            <div className="space-y-2">
              <label className="label text-xs">Profile or referral link (optional)</label>
              <input
                className="input text-sm"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder={`Defaults to ${getPlatformDomain(selectedName)}`}
              />
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              className="btn-primary text-sm"
              disabled={!selectedName || saving}
              onClick={add}
            >
              {saving ? "Saving…" : "Add platform"}
            </button>
            <button
              type="button"
              className="btn-ghost text-sm"
              onClick={() => {
                setOpen(false);
                setQuery("");
                setSelectedName(null);
                setLink("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {msg && <p className="text-xs text-primary">{msg}</p>}
      {err && <p className="text-xs text-danger">{err}</p>}
    </div>
  );
}
