"use client";

import { useEffect, useState } from "react";
import {
  savePendingAutofill,
  loadPendingAutofill,
  clearPendingAutofill,
  type PendingAutofill,
  type AutofillPayload,
} from "@/lib/autofill-store";

export default function DashboardAutofill() {
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAutofill | null>(null);

  useEffect(() => {
    setPending(loadPendingAutofill());
    function onChange(ev: Event) {
      setPending((ev as CustomEvent).detail ?? loadPendingAutofill());
    }
    window.addEventListener("pow3-pending-autofill", onChange);
    return () => window.removeEventListener("pow3-pending-autofill", onChange);
  }, []);

  function applyPayload(profile: AutofillPayload, source?: string) {
    const stored = savePendingAutofill(profile, source);
    setPending(stored);
    if (!stored.pending.length) {
      setMsg("Nothing useful extracted. Try another file or link.");
      return;
    }
    setMsg(
      `Ready. Open highlighted sections (${stored.pending.join(", ")}), review amber fields, then Save in each section. Stays until you save or refresh.`
    );
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr(null);
    setMsg(null);
    if (!/\.(pdf|txt|md|doc|docx)$/i.test(file.name)) {
      setErr("Use PDF, TXT, MD, DOC or DOCX");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setErr("File under 4MB");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file, file.name);
      const res = await fetch("/api/ai/autofill", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr((data.error || "Could not read file") + (data.detail ? ` (${data.detail})` : ""));
        return;
      }
      if (!data.profile) {
        setErr("No data extracted");
        return;
      }
      applyPayload(data.profile as AutofillPayload, file.name);
    } catch {
      setErr("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleLink() {
    setErr(null);
    setMsg(null);
    const url = link.trim();
    if (!url) {
      setErr("Paste a public link first");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ai/autofill-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || "Could not read link");
        return;
      }
      if (!data.profile) {
        setErr("No data extracted from link");
        return;
      }
      applyPayload(data.profile as AutofillPayload, data.source || url);
    } catch {
      setErr("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Import & autofill</h2>
          <p className="mt-1 text-xs text-foreground-muted max-w-xl leading-relaxed">
            Upload a CV or paste a <span className="text-foreground">public</span> link (Notion share,
            GitHub profile, personal site, portfolio). Login-walled sites like LinkedIn cannot be read.
            Sections that get data light up amber on the dashboard. Open each one, review, then Save.
            Unsaved imports stay until you refresh the browser.
          </p>
        </div>
        {pending && pending.pending.length > 0 && (
          <button
            type="button"
            className="btn-ghost text-xs text-danger shrink-0 mt-2 sm:mt-0"
            onClick={() => {
              clearPendingAutofill();
              setPending(null);
              setMsg("Cleared pending autofill");
            }}
          >
            Clear pending
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="btn-secondary cursor-pointer text-xs sm:text-sm w-fit shrink-0">
          {loading ? "Working…" : "Upload CV / doc"}
          <input
            type="file"
            accept=".pdf,.txt,.md,.doc,.docx,application/pdf,text/plain"
            className="hidden"
            disabled={loading}
            onChange={handleFile}
          />
        </label>
        <div className="flex flex-1 gap-2 min-w-0">
          <input
            className="input text-sm flex-1 min-w-0"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://notion.site/… or github.com/you"
            disabled={loading}
          />
          <button
            type="button"
            className="btn-primary text-xs sm:text-sm shrink-0"
            disabled={loading}
            onClick={handleLink}
          >
            Import link
          </button>
        </div>
      </div>

      {pending && pending.pending.length > 0 && (
        <p className="mt-3 text-xs text-amber-500">
          Pending review:{" "}
          <span className="font-medium">{pending.pending.join(" · ")}</span>
          {pending.source ? ` · from ${pending.source}` : ""}
        </p>
      )}
      {msg && <p className="mt-2 text-xs text-primary">{msg}</p>}
      {err && <p className="mt-2 text-xs text-danger break-words">{err}</p>}
    </div>
  );
}
