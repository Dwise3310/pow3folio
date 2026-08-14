"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { WorkExperience, Education } from "@/types/database";

type Props = {
  userId: string;
  initialWork: WorkExperience[];
  initialEducation: Education[];
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function absoluteUrl(url: string): string | null {
  const t = url.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t.replace(/^\/+/, "")}`;
}

/** Normalize AI date strings to YYYY-MM when possible. */
function toMonth(raw: string | null | undefined): string {
  if (!raw) return "";
  const s = String(raw).trim();
  const m = s.match(/^(\d{4})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}`;
  const y = s.match(/^(\d{4})$/);
  if (y) return `${y[1]}-01`;
  return s.slice(0, 7);
}

function toYear(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = String(raw).match(/(\d{4})/);
  return m ? m[1] : String(raw).slice(0, 4) || null;
}

export default function ProfileExtrasManager({
  userId,
  initialWork,
  initialEducation,
}: Props) {
  const router = useRouter();
  const [work, setWork] = useState<WorkExperience[]>(initialWork ?? []);
  const [edu, setEdu] = useState<Education[]>(initialEducation ?? []);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [wForm, setWForm] = useState({
    company: "",
    description: "",
    url: "",
    role: "",
    employment_type: "full-time" as "full-time" | "part-time",
    start_date: "",
    end_date: "",
  });
  const [showWorkForm, setShowWorkForm] = useState(false);

  const [eForm, setEForm] = useState({
    institution: "",
    degree: "",
    field_of_study: "",
    country: "",
    start_year: "",
    end_year: "",
    description: "",
    url: "",
  });
  const [showEduForm, setShowEduForm] = useState(false);

  async function persist(nextWork: WorkExperience[], nextEdu: Education[]) {
    setSaving(true);
    setErr(null);
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        work_experience: nextWork,
        education: nextEdu,
      })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      setErr(
        error.message.includes("column")
          ? "Run the SQL migration for work_experience and education columns first."
          : error.message
      );
      return false;
    }
    setWork(nextWork);
    setEdu(nextEdu);
    setMsg("Saved");
    router.refresh();
    return true;
  }

  // Listen for CV autofill from ProfileForm
  useEffect(() => {
    function onAutofill(ev: Event) {
      const detail = (ev as CustomEvent).detail as {
        work_experience?: {
          company?: string;
          role?: string;
          description?: string;
          url?: string;
          employment_type?: string;
          start_date?: string;
          end_date?: string | null;
        }[];
        education?: {
          institution?: string;
          degree?: string;
          field_of_study?: string;
          country?: string;
          start_year?: string;
          end_year?: string;
          description?: string;
          url?: string;
        }[];
      } | null;
      if (!detail) return;

      setWork((prev) => {
        const incoming = Array.isArray(detail.work_experience)
          ? detail.work_experience
          : [];
        const mapped: WorkExperience[] = incoming
          .filter((w) => w?.company && w?.role)
          .slice(0, 5)
          .map((w) => ({
            id: uid(),
            company: String(w.company).trim().slice(0, 120),
            role: String(w.role).trim().slice(0, 120),
            description: w.description ? String(w.description).trim().slice(0, 300) : null,
            url: w.url ? absoluteUrl(String(w.url)) : null,
            employment_type:
              w.employment_type === "part-time" ? "part-time" : "full-time",
            start_date: toMonth(w.start_date) || new Date().toISOString().slice(0, 7),
            end_date: w.end_date ? toMonth(w.end_date) || null : null,
          }));

        if (!mapped.length) return prev;

        // Merge: keep existing, add new by company+role that are not already present
        const next = [...prev];
        for (const item of mapped) {
          if (next.length >= 5) break;
          const exists = next.some(
            (x) =>
              x.company.toLowerCase() === item.company.toLowerCase() &&
              x.role.toLowerCase() === item.role.toLowerCase()
          );
          if (!exists) next.push(item);
        }

        // Persist after state settle via queueMicrotask path
        queueMicrotask(() => {
          setEdu((eduPrev) => {
            const incomingEdu = Array.isArray(detail.education)
              ? detail.education
              : [];
            const mappedEdu: Education[] = incomingEdu
              .filter((e) => e?.institution)
              .slice(0, 8)
              .map((e) => ({
                id: uid(),
                institution: String(e.institution).trim().slice(0, 120),
                degree: e.degree ? String(e.degree).trim().slice(0, 80) : null,
                field_of_study: e.field_of_study
                  ? String(e.field_of_study).trim().slice(0, 80)
                  : null,
                country: e.country ? String(e.country).trim().slice(0, 60) : null,
                start_year: toYear(e.start_year),
                end_year: toYear(e.end_year),
                description: e.description
                  ? String(e.description).trim().slice(0, 200)
                  : null,
                url: e.url ? absoluteUrl(String(e.url)) : null,
              }));

            let eduNext = [...eduPrev];
            for (const item of mappedEdu) {
              const exists = eduNext.some(
                (x) =>
                  x.institution.toLowerCase() === item.institution.toLowerCase()
              );
              if (!exists) eduNext.push(item);
            }

            void persist(next, eduNext).then((ok) => {
              if (ok) {
                setMsg(
                  "Work and education filled from your CV. Review the cards below."
                );
              }
            });
            return eduNext;
          });
        });

        return next;
      });
    }

    window.addEventListener("pow3-autofill-extras", onAutofill);
    return () => window.removeEventListener("pow3-autofill-extras", onAutofill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function addWork() {
    if (!wForm.company.trim() || !wForm.role.trim() || !wForm.start_date) {
      setErr("Company, role and start date are required");
      return;
    }
    if (work.length >= 5) {
      setErr("Max 5 work experiences");
      return;
    }
    const item: WorkExperience = {
      id: uid(),
      company: wForm.company.trim(),
      description: wForm.description.trim() || null,
      url: absoluteUrl(wForm.url),
      role: wForm.role.trim(),
      employment_type: wForm.employment_type,
      start_date: wForm.start_date,
      end_date: wForm.end_date.trim() || null,
    };
    const ok = await persist([...work, item], edu);
    if (ok) {
      setShowWorkForm(false);
      setWForm({
        company: "",
        description: "",
        url: "",
        role: "",
        employment_type: "full-time",
        start_date: "",
        end_date: "",
      });
    }
  }

  async function removeWork(id: string) {
    await persist(
      work.filter((w) => w.id !== id),
      edu
    );
  }

  async function addEdu() {
    if (!eForm.institution.trim()) {
      setErr("Institution is required");
      return;
    }
    const item: Education = {
      id: uid(),
      institution: eForm.institution.trim(),
      degree: eForm.degree.trim() || null,
      field_of_study: eForm.field_of_study.trim() || null,
      country: eForm.country.trim() || null,
      start_year: eForm.start_year.trim() || null,
      end_year: eForm.end_year.trim() || null,
      description: eForm.description.trim() || null,
      url: absoluteUrl(eForm.url),
    };
    const ok = await persist(work, [...edu, item]);
    if (ok) {
      setShowEduForm(false);
      setEForm({
        institution: "",
        degree: "",
        field_of_study: "",
        country: "",
        start_year: "",
        end_year: "",
        description: "",
        url: "",
      });
    }
  }

  async function removeEdu(id: string) {
    await persist(
      work,
      edu.filter((e) => e.id !== id)
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">Work experience</h2>
            <p className="text-xs text-foreground-muted">
              Max 5 entries. Filled from CV upload when available.
            </p>
          </div>
          {!showWorkForm && work.length < 5 && (
            <button
              type="button"
              className="btn-secondary text-sm"
              onClick={() => {
                setShowWorkForm(true);
                setErr(null);
              }}
            >
              Add experience
            </button>
          )}
        </div>

        {work.length === 0 && !showWorkForm && (
          <p className="text-xs text-foreground-subtle rounded-lg border border-dashed border-border px-3 py-4 text-center">
            No work entries yet. Upload a CV above or add manually.
          </p>
        )}

        {work.map((w) => (
          <div key={w.id} className="rounded-xl border border-border bg-surface-elevated p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-sm">{w.company}</p>
                <p className="text-xs text-foreground-muted">
                  {w.role} · {w.employment_type === "full-time" ? "Full-time" : "Part-time"}
                </p>
                <p className="text-xs text-foreground-subtle mt-0.5">
                  {w.start_date}
                  {w.end_date ? ` → ${w.end_date}` : " → Present"}
                </p>
                {w.description && (
                  <p className="mt-1 text-xs text-foreground-muted line-clamp-2">{w.description}</p>
                )}
              </div>
              <button
                type="button"
                className="btn-ghost text-xs text-danger shrink-0"
                onClick={() => removeWork(w.id)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        {showWorkForm && (
          <div className="rounded-xl border border-border p-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label text-xs">Company / Project *</label>
                <input
                  className="input text-sm"
                  value={wForm.company}
                  onChange={(e) => setWForm({ ...wForm, company: e.target.value })}
                  placeholder="Rapha Pharmaceutical, KiiChain…"
                />
              </div>
              <div>
                <label className="label text-xs">Role *</label>
                <input
                  className="input text-sm"
                  value={wForm.role}
                  onChange={(e) => setWForm({ ...wForm, role: e.target.value })}
                  placeholder="Community Manager, Strategist…"
                />
              </div>
            </div>
            <div>
              <label className="label text-xs">Description</label>
              <textarea
                className="input text-sm min-h-[60px]"
                value={wForm.description}
                onChange={(e) => setWForm({ ...wForm, description: e.target.value })}
                placeholder="What you did and impact"
                maxLength={300}
              />
            </div>
            <div>
              <label className="label text-xs">Link (optional)</label>
              <input
                className="input text-sm"
                value={wForm.url}
                onChange={(e) => setWForm({ ...wForm, url: e.target.value })}
                placeholder="https://kiichain.io"
              />
            </div>
            <div className="flex flex-wrap gap-4 items-center">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={wForm.employment_type === "full-time"}
                  onChange={() => setWForm({ ...wForm, employment_type: "full-time" })}
                />
                Full-time
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={wForm.employment_type === "part-time"}
                  onChange={() => setWForm({ ...wForm, employment_type: "part-time" })}
                />
                Part-time
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label text-xs">Start date *</label>
                <input
                  type="month"
                  className="input text-sm"
                  value={wForm.start_date}
                  onChange={(e) => setWForm({ ...wForm, start_date: e.target.value })}
                />
              </div>
              <div>
                <label className="label text-xs">End date (blank = present)</label>
                <input
                  type="month"
                  className="input text-sm"
                  value={wForm.end_date}
                  onChange={(e) => setWForm({ ...wForm, end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-primary text-sm" disabled={saving} onClick={addWork}>
                {saving ? "Saving…" : "Save experience"}
              </button>
              <button
                type="button"
                className="btn-ghost text-sm"
                onClick={() => setShowWorkForm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">Education</h2>
            <p className="text-xs text-foreground-muted">Degrees and studies. Shown under About.</p>
          </div>
          {!showEduForm && (
            <button
              type="button"
              className="btn-secondary text-sm"
              onClick={() => {
                setShowEduForm(true);
                setErr(null);
              }}
            >
              Add education
            </button>
          )}
        </div>

        {edu.map((e) => (
          <div key={e.id} className="rounded-xl border border-border bg-surface-elevated p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-sm">{e.institution}</p>
                <p className="text-xs text-foreground-muted">
                  {[e.degree, e.field_of_study].filter(Boolean).join(" · ")}
                </p>
                <p className="text-xs text-foreground-subtle mt-0.5">
                  {[e.country, e.start_year && e.end_year ? `${e.start_year} – ${e.end_year}` : e.start_year || e.end_year]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <button
                type="button"
                className="btn-ghost text-xs text-danger shrink-0"
                onClick={() => removeEdu(e.id)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        {showEduForm && (
          <div className="rounded-xl border border-border p-3 space-y-3">
            <div>
              <label className="label text-xs">Institution *</label>
              <input
                className="input text-sm"
                value={eForm.institution}
                onChange={(e) => setEForm({ ...eForm, institution: e.target.value })}
                placeholder="University of Calabar"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label text-xs">Degree</label>
                <input
                  className="input text-sm"
                  value={eForm.degree}
                  onChange={(e) => setEForm({ ...eForm, degree: e.target.value })}
                  placeholder="PharmD, BSc, MSc…"
                />
              </div>
              <div>
                <label className="label text-xs">Field of study</label>
                <input
                  className="input text-sm"
                  value={eForm.field_of_study}
                  onChange={(e) => setEForm({ ...eForm, field_of_study: e.target.value })}
                  placeholder="Pharmacy, Computer Science…"
                />
              </div>
            </div>
            <div>
              <label className="label text-xs">Country of studies</label>
              <input
                className="input text-sm"
                value={eForm.country}
                onChange={(e) => setEForm({ ...eForm, country: e.target.value })}
                placeholder="Nigeria"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label text-xs">Start year</label>
                <input
                  className="input text-sm"
                  value={eForm.start_year}
                  onChange={(e) => setEForm({ ...eForm, start_year: e.target.value })}
                  placeholder="2022"
                  maxLength={4}
                />
              </div>
              <div>
                <label className="label text-xs">End year (or expected)</label>
                <input
                  className="input text-sm"
                  value={eForm.end_year}
                  onChange={(e) => setEForm({ ...eForm, end_year: e.target.value })}
                  placeholder="2026"
                  maxLength={4}
                />
              </div>
            </div>
            <div>
              <label className="label text-xs">Description (optional)</label>
              <textarea
                className="input text-sm min-h-[50px]"
                value={eForm.description}
                onChange={(e) => setEForm({ ...eForm, description: e.target.value })}
                maxLength={200}
              />
            </div>
            <div>
              <label className="label text-xs">Link (optional)</label>
              <input
                className="input text-sm"
                value={eForm.url}
                onChange={(e) => setEForm({ ...eForm, url: e.target.value })}
                placeholder="https://…"
              />
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-primary text-sm" disabled={saving} onClick={addEdu}>
                {saving ? "Saving…" : "Save education"}
              </button>
              <button
                type="button"
                className="btn-ghost text-sm"
                onClick={() => setShowEduForm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {msg && <p className="text-xs text-primary">{msg}</p>}
      {err && <p className="text-xs text-danger">{err}</p>}
    </div>
  );
}
