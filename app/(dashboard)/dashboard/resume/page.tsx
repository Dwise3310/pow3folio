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

  return (
    <div className="resume-page min-h-screen bg-[#f4f5f7] text-[#111827]">
      <style>{`@page { margin: 12mm 12mm; size: A4; } @media print { .no-print { display: none !important; } html, body { background: white !important; } a { color: inherit !important; text-decoration: none !important; } .resume-sheet { box-shadow: none !important; margin: 0 !important; max-width: none !important; } }`}</style>
      <div className="no-print mx-auto flex max-w-[820px] items-center justify-between gap-3 px-4 py-4">
        <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Dashboard
        </Link>
        <PrintResume />
      </div>
      <article className="resume-sheet mx-auto mb-10 max-w-[820px] bg-white px-8 py-8 shadow-sm print:mb-0 print:max-w-none print:px-0 print:py-0 print:shadow-none">
        <header className="grid grid-cols-1 gap-4 border-b border-zinc-200 pb-5 sm:grid-cols-[1.4fr_0.8fr]">
          <div>
            <h1 className="text-[30px] font-bold leading-tight tracking-tight text-[#0f172a]">
              {p.display_name || p.username}
            </h1>
            {p.bio && (
              <p className="mt-2 text-[13px] leading-relaxed text-zinc-600">{cleanPlainText(p.bio, 280)}</p>
            )}
          </div>
          <ul className="space-y-1 text-[11.5px] leading-snug text-zinc-600 sm:text-right">
            {contacts.map((c) => (
              <li key={c} className="break-words">{c}</li>
            ))}
            <li className="text-zinc-400">pow3folio.vercel.app/{p.username}</li>
          </ul>
        </header>
        <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-[1.45fr_0.75fr]">
          <div className="min-w-0 space-y-6">
            {summary && (
              <section>
                <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#1d4ed8]">Summary</h2>
                <p className="text-[12.5px] leading-relaxed text-zinc-700">{summary}</p>
              </section>
            )}
            {work.length > 0 && (
              <section>
                <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#1d4ed8]">Work experience</h2>
                <div className="space-y-4">
                  {work.map((w) => (
                    <div key={w.id}>
                      <p className="text-[13px] font-semibold text-[#0f172a]">
                        {w.company}
                        <span className="font-normal text-zinc-500">
                          {" "}· {w.start_date}{w.end_date ? ` – ${w.end_date}` : " – Present"}
                        </span>
                      </p>
                      <p className="text-[12.5px] font-medium text-zinc-800">
                        {w.role} · {w.employment_type === "full-time" ? "Full-time" : "Part-time"}
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
                <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#1d4ed8]">Projects & collaborations</h2>
                <div className="space-y-3">
                  {projects.map((c) => (
                    <div key={c.id}>
                      <p className="text-[13px] font-semibold text-[#0f172a]">
                        {c.title}
                        {c.role ? <span className="font-normal text-zinc-600"> · {c.role}</span> : null}
                        <span className="ml-1 text-[10px] font-medium uppercase tracking-wide text-zinc-400">{categoryOf(c)}</span>
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
                <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#1d4ed8]">Writing & research</h2>
                <div className="space-y-2">
                  {writingItems.slice(0, 8).map((w) => (
                    <div key={w.id}>
                      <p className="text-[13px] font-semibold text-[#0f172a]">
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
          <aside className="min-w-0 space-y-6">
            {skillList.length > 0 && (
              <section>
                <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#1d4ed8]">Skills</h2>
                <ul className="space-y-1.5">
                  {skillList.map((s) => (
                    <li key={s.name} className="text-[12.5px] leading-snug text-zinc-700">
                      <span className="font-medium text-[#0f172a]">{s.name}</span>
                      {s.description ? <span className="block text-[11.5px] text-zinc-500">{cleanPlainText(s.description, 140)}</span> : null}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {edu.length > 0 && (
              <section>
                <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#1d4ed8]">Education</h2>
                <div className="space-y-3">
                  {edu.map((e) => (
                    <div key={e.id}>
                      <p className="text-[13px] font-semibold text-[#0f172a]">{e.degree || e.institution}</p>
                      <p className="text-[12px] text-zinc-600">{e.institution}</p>
                      <p className="text-[11px] text-zinc-500">
                        {[e.field_of_study, e.country, [e.start_year, e.end_year].filter(Boolean).join(" – ")].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {docs.length > 0 && (
              <section>
                <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#1d4ed8]">Credentials</h2>
                <ul className="space-y-1">
                  {docs.map((d) => (
                    <li key={d.id} className="text-[12.5px] text-zinc-700">
                      {d.title}{d.issuer ? <span className="text-zinc-500"> · {d.issuer}</span> : null}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
        <p className="mt-8 text-[10px] text-zinc-400">
          Private CV generated from your Pow3Folio profile. Only you can download this file.
        </p>
      </article>
    </div>
  );
}
