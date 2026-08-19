import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type {
  Profile,
  Writing,
  CommunityItem,
  Credential,
  WorkExperience,
  Education,
} from "@/types/database";
import PrintResume from "@/components/profile/PrintResume";
import { normalizeSkills, cleanPlainText } from "@/lib/skills";

function categoryOf(item: CommunityItem): string {
  const tags = item.tags ?? [];
  for (const t of tags) {
    const k = t.toLowerCase().trim();
    if (k === "built" || k === "built by me") return "Built by me";
    if (k === "collaboration" || k === "collab") return "Collaboration";
    if (k === "community" || k === "community role") return "Community role";
  }
  return "Project";
}

function uniqueEducation(list: Education[]): Education[] {
  const seen = new Set<string>();
  const out: Education[] = [];
  for (const e of list) {
    const key = `${(e.institution || "").toLowerCase()}|${(e.degree || "").toLowerCase()}|${e.start_year || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

function looksLikeJunk(title: string, description?: string | null): boolean {
  const t = `${title} ${description || ""}`.trim();
  if (t.length < 4) return true;
  if (/^[a-z0-9]{8,}$/i.test(title.replace(/\s/g, ""))) return true;
  const letters = t.replace(/[^a-zA-Z]/g, "");
  return letters.length < 6;
}

function sep(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" / ");
}

export default async function DashboardResumePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!profile) redirect("/dashboard/profile");
  const p = profile as Profile;

  const [{ data: writings }, { data: community }, { data: credentials }] = await Promise.all([
    supabase.from("writings").select("*").eq("user_id", p.id).eq("is_visible", true).order("sort_order", { ascending: true }),
    supabase.from("community_items").select("*").eq("user_id", p.id).eq("is_visible", true).order("sort_order", { ascending: true }),
    supabase.from("credentials").select("*").eq("user_id", p.id).eq("is_visible", true).order("sort_order", { ascending: true }),
  ]);

  const skillList = normalizeSkills(p.skills);
  const work = Array.isArray(p.work_experience) ? (p.work_experience as WorkExperience[]) : [];
  const edu = uniqueEducation(Array.isArray(p.education) ? (p.education as Education[]) : []);
  const writingItems = ((writings as Writing[]) ?? []).filter((w) => !looksLikeJunk(w.title, w.description));
  const projects = (community as CommunityItem[]) ?? [];
  const docs = (credentials as Credential[]) ?? [];

  const location =
    p.location_country && p.location_region
      ? `${p.location_region}, ${p.location_country}`
      : p.location_country || p.location_region || "";

  const contacts = [
    location,
    p.show_primary_email && p.primary_email ? p.primary_email : null,
    p.show_secondary_email && p.secondary_email ? p.secondary_email : null,
    p.website_url,
    p.github_url,
    p.x_url,
    p.telegram_url,
  ].filter(Boolean) as string[];

  const summary = cleanPlainText(p.long_bio || p.bio, 700);
  const roleLine = skillList.slice(0, 3).map((s) => s.name).join(" / ");

  return (
    <div className="resume-page min-h-screen bg-[#e8ece8] text-[#12201a]">
      <style>{`
        @page { margin: 10mm 10mm; size: A4; }
        @media print {
          .no-print { display: none !important; }
          html, body { background: white !important; }
          a { color: inherit !important; text-decoration: none !important; }
          .resume-sheet { box-shadow: none !important; margin: 0 !important; max-width: none !important; }
        }
        .resume-sheet { position: relative; overflow: hidden; }
        .resume-sheet::before {
          content: "Pow3Folio";
          position: absolute;
          left: 50%;
          top: 46%;
          transform: translate(-50%, -50%) rotate(-32deg);
          font-size: 92px;
          font-weight: 800;
          letter-spacing: 0.14em;
          color: rgba(16, 185, 129, 0.07);
          white-space: nowrap;
          pointer-events: none;
          z-index: 0;
        }
        .resume-inner { position: relative; z-index: 1; }
        .resume-rule { height: 1px; background: linear-gradient(90deg, #10b981, rgba(16,185,129,0.08)); }
      `}</style>
      <div className="no-print mx-auto flex max-w-[860px] items-center justify-between gap-3 px-4 py-4">
        <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-800">
          Back to dashboard
        </Link>
        <PrintResume />
      </div>
      <article className="resume-sheet mx-auto mb-10 max-w-[860px] bg-white shadow-[0_18px_50px_rgba(16,24,20,0.08)] print:mb-0 print:max-w-none print:shadow-none">
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-teal-400" />
        <div className="resume-inner px-8 py-7 print:px-6 print:py-5">
          <header className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-700">Curriculum vitae</p>
              <h1 className="mt-1 text-[30px] font-bold leading-tight tracking-tight text-[#0b1f18]">
                {p.display_name || p.username}
              </h1>
              {roleLine && <p className="mt-1 text-[13px] font-medium text-emerald-800">{roleLine}</p>}
              {p.bio && (
                <p className="mt-2 max-w-[34rem] text-[12.5px] leading-relaxed text-zinc-600">{cleanPlainText(p.bio, 220)}</p>
              )}
            </div>
            <div className="hidden shrink-0 text-right sm:block">
              <div className="ml-auto flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <span className="text-sm font-bold">P3</span>
              </div>
              <p className="mt-2 text-[10px] font-semibold tracking-wide text-emerald-700">Pow3Folio</p>
              <p className="text-[10px] text-zinc-400">pow3folio.vercel.app/{p.username}</p>
            </div>
          </header>
          {contacts.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-y border-emerald-100 py-2.5 text-[11px] text-zinc-600">
              {contacts.map((c) => (
                <li key={c} className="break-words">{c}</li>
              ))}
            </ul>
          )}
          <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-[1.55fr_0.85fr]">
            <div className="min-w-0 space-y-6">
              {summary && (
                <section>
                  <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-800">Profile</h2>
                  <div className="resume-rule mb-2.5" />
                  <p className="text-[12.5px] leading-relaxed text-zinc-700">{summary}</p>
                </section>
              )}
              {work.length > 0 && (
                <section>
                  <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-800">Experience</h2>
                  <div className="resume-rule mb-3" />
                  <div className="space-y-4">
                    {work.map((w) => (
                      <div key={w.id} className="relative pl-3 before:absolute before:left-0 before:top-1.5 before:h-full before:w-px before:bg-emerald-100">
                        <p className="text-[13px] font-semibold text-[#0b1f18]">{w.role}</p>
                        <p className="text-[12px] text-emerald-800">
                          {w.company}
                          <span className="font-normal text-zinc-500">
                            {" "}{sep([w.employment_type === "full-time" ? "Full-time" : "Part-time", `${w.start_date}${w.end_date ? ` to ${w.end_date}` : " to Present"}`])}
                          </span>
                        </p>
                        {w.description && (
                          <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-600">{cleanPlainText(w.description, 420)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {projects.length > 0 && (
                <section>
                  <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-800">Projects and collaborations</h2>
                  <div className="resume-rule mb-3" />
                  <div className="space-y-3">
                    {projects.map((c) => (
                      <div key={c.id}>
                        <p className="text-[13px] font-semibold text-[#0b1f18]">
                          {c.title}
                          {c.role ? <span className="font-normal text-zinc-600"> / {c.role}</span> : null}
                          <span className="ml-2 rounded-sm bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-700">
                            {categoryOf(c)}
                          </span>
                        </p>
                        {c.description && (
                          <p className="mt-0.5 text-[12.5px] leading-relaxed text-zinc-600">{cleanPlainText(c.description, 260)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {writingItems.length > 0 && (
                <section>
                  <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-800">Writing and research</h2>
                  <div className="resume-rule mb-3" />
                  <div className="space-y-2">
                    {writingItems.slice(0, 8).map((w) => (
                      <div key={w.id}>
                        <p className="text-[13px] font-semibold text-[#0b1f18]">
                          {w.title}
                          {w.published_at ? <span className="ml-2 text-[11px] font-normal text-zinc-500">{w.published_at}</span> : null}
                        </p>
                        {w.description && (
                          <p className="text-[12.5px] leading-relaxed text-zinc-600">{cleanPlainText(w.description, 180)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
            <aside className="min-w-0 space-y-6 rounded-xl bg-[#f4faf6] px-4 py-4">
              {skillList.length > 0 && (
                <section>
                  <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-800">Skills</h2>
                  <div className="flex flex-wrap gap-1.5">
                    {skillList.map((s) => (
                      <span key={s.name} className="rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[11px] font-medium text-emerald-900">
                        {s.name}
                      </span>
                    ))}
                  </div>
                </section>
              )}
              {edu.length > 0 && (
                <section>
                  <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-800">Education</h2>
                  <div className="space-y-3">
                    {edu.map((e) => (
                      <div key={e.id}>
                        <p className="text-[13px] font-semibold text-[#0b1f18]">{e.degree || e.institution}</p>
                        <p className="text-[12px] text-zinc-600">{e.institution}</p>
                        <p className="text-[11px] text-zinc-500">{sep([e.field_of_study, e.country, [e.start_year, e.end_year].filter(Boolean).join(" to ")])}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {docs.length > 0 && (
                <section>
                  <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-800">Credentials</h2>
                  <ul className="space-y-1.5">
                    {docs.map((d) => (
                      <li key={d.id} className="text-[12px] text-zinc-700">
                        {d.title}
                        {d.issuer ? <span className="block text-[11px] text-zinc-500">{d.issuer}</span> : null}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </aside>
          </div>
        </div>
      </article>
    </div>
  );
}
