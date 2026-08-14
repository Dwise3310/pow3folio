"use client";

import { useState } from "react";

export type AutofillPayload = {
  display_name?: string;
  bio?: string;
  long_bio?: string;
  skills?: { name: string; description: string }[];
  work_experience?: {
    company: string;
    role: string;
    description?: string;
    url?: string;
    employment_type?: "full-time" | "part-time";
    start_date?: string;
    end_date?: string | null;
  }[];
  education?: {
    institution: string;
    degree?: string;
    field_of_study?: string;
    country?: string;
    start_year?: string;
    end_year?: string;
    description?: string;
  }[];
  website_url?: string;
  github_url?: string;
  x_url?: string;
  location_country?: string;
  location_region?: string;
};

type Props = {
  onApply: (data: AutofillPayload) => void;
};

export default function ProfileAutofill({ onApply }: Props) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setErr(null);
    setMsg(null);

    const allowed = [
      "text/plain",
      "text/markdown",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const okType =
      allowed.includes(file.type) ||
      /\.(txt|md|pdf|doc|docx)$/i.test(file.name);
    if (!okType) {
      setErr("Upload a PDF, DOC, DOCX, TXT or MD file");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setErr("File must be under 4MB");
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/ai/autofill", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || "Could not read file");
        setLoading(false);
        return;
      }
      if (!data.profile || typeof data.profile !== "object") {
        setErr("No profile data extracted");
        setLoading(false);
        return;
      }
      onApply(data.profile as AutofillPayload);
      setMsg("Fields filled from your document. Review and click Save profile.");
    } catch {
      setErr("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface-elevated/50 p-3 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Fill from CV or profile doc</p>
          <p className="text-xs text-foreground-subtle mt-0.5">
            Pow3Bot reads the file and suggests bio, skills, work and education. You still confirm with Save.
          </p>
        </div>
        <label className="btn-secondary cursor-pointer text-xs sm:text-sm shrink-0 w-fit">
          {loading ? "Reading…" : "Upload CV / doc"}
          <input
            type="file"
            accept=".pdf,.doc,.docx,.txt,.md,text/plain,application/pdf"
            className="hidden"
            onChange={handleFile}
            disabled={loading}
          />
        </label>
      </div>
      {msg && (
        <p className="mt-2 text-xs text-primary">{msg}</p>
      )}
      {err && (
        <p className="mt-2 text-xs text-danger">{err}</p>
      )}
    </div>
  );
}
