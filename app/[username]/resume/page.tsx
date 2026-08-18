import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type {
  Profile,
  Writing,
  CommunityItem,
  Credential,
  Skill,
  WorkExperience,
  Education,
} from "@/types/database";
import PrintResume from "@/components/profile/PrintResume";

type Props = {
  params: Promise<{ username: string }>;
};

function skills(raw: Profile["skills"]): Skill[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw
    .map((s) => {
      if (typeof s === "string") return { name: s.trim().slice(0, 60), description: "" };
      if (s && typeof s === "object" && "name" in s) {
        return {
          name: String((s as Skill).name || "").slice(0, 60),
          description: String((s as Skill).description || "").slice(0, 250),
        };
      }
      return { name: "", description: "" };
    })
    .filter((s) => s.name);
}

function categoryOf(item: CommunityItem): string {
  const tags = item.tags ?? [];
  for (const t of tags) {
    const k = t.toLowerCase().trim();
    if (k === "built" || k === "built by me") return "Built";
    if (k === "collaboration" || k === "collab") return "Collab";
    if (k === "community" || k === "community role") return "Community";
  }
  return "Project";
}

export default async function ResumePage({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username.toLowerCase())
    .eq("is_public", true)
    .maybeSingle();

  if (!profile) notFound();
  const p = profile as Profile;

  const [{ data: writings }, { data: community }, { data: credentials }] = await Promise.all([
    supabase.from("writings").select("*").eq("user_id", p.id).eq("is_visible", true).order("sort_order", { ascending: true }),
    supabase.from("community_items").select("*").eq("user_id", p.id).eq("is_visible", true).order("sort_order", { ascending: true }),
    supabase.from("credentials").select("*").eq("user_id", p.id).eq("is_visible", true).order("sort_order", { ascending: true }),
  ]);

  const skillList = skills(p.skills);
  const work = Array.isArray(p.work_experience) ? (p.work_experience as WorkExperience[]) : [];
  const edu = Array.isArray(p.education) ? (p.education as Education[]) : [];
  const writingItems = (writings as Writing[]) ?? [];
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

  return (
    <div className="resume-page min-h-screen bg-white text-zinc-900">
      <style>{`@page { margin: 14mm 14mm; size: A4; } @media print { .no-print { display: none !important; } body { background: white !important; } a { color: inherit !important; text-decoration: none !important; } }`}</style>
      <div className="no-print mx-auto flex max-w-[780px] items-center justify-between gap-3 px-6 py-4">
        <Link href={`/${p.username}`} className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Back to profile
        </Link>
        <PrintResume />
      </div>
      <article className="mx-auto max-w-[780px] bg-white px-6 pb-16 pt-2 print:max-w-none print:px-0 print:pb-0">
        <header className="border-b border-zinc-200 pb-4">
          <h1 className="text-[26px] font-bold tracking-tight text-zinc-900">{p.display_name || p.username}</h1>
          <p className="mt-0.5 text-sm text-zinc-500">@{p.username} · pow3folio.vercel.app/{p.username}</p>
          {p.bio && <p className="mt-2 text-[13px] leading-relaxed text-zinc-700">{p.bio}</p>}
          {contacts.length > 0 && (
            <p className="mt-2 text-[12px] leading-relaxed text-zinc-600 break-words">{contacts.join("  ·  ")}</p>
          )}
        </header>
        {p.long_bio && (
          <section className="mt-5">
            <h2 className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">Summary</h2>
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-700">{p.long_bio}</p>
          </section>
        )}
        {skillList.length > 0 && (
          <section className="mt-5">
            <h2 className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">Skills</h2>
            <ul className="space-y-1">
              {skillList.map((s) => (
                <li key={s.name} className="text-[13px] leading-snug text-zinc-700">
                  <span className="font-semibold text-zinc-900">{s.name}</span>
                  {s.description ? ` — ${s.description}` : ""}
                </li>
              ))}
            </ul>
          </section>
        )}
        {work.length > 0 && (
          <section className="mt-5">
            <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">Experience</h2>
            <div className="space-y-3">
              {work.map((w) => (
                <div key={w.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <p className="text-[13px] font-semibold text-zinc-900">{w.role} · {w.company}</p>
                    <p className="text-[11px] text-zinc-500">{w.start_date}{w.end_date ? ` – ${w.end_date}` : " – Present"}</p>
                  </div>
                  <p className="text-[11px] text-zinc-500">{w.employment_type === "full-time" ? "Full-time" : "Part-time"}{w.url ? ` · ${w.url}` : ""}</p>
                  {w.description && <p className="mt-1 text-[13px] leading-relaxed text-zinc-700">{w.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
        {edu.length > 0 && (
          <section className="mt-5">
            <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">Education</h2>
            <div className="space-y-2">
              {edu.map((e) => (
                <div key={e.id}>
                  <p className="text-[13px] font-semibold text-zinc-900">{e.institution}</p>
                  <p className="text-[13px] text-zinc-700">{[e.degree, e.field_of_study, e.country].filter(Boolean).join(" · ")}</p>
                  <p className="text-[11px] text-zinc-500">{[e.start_year, e.end_year].filter(Boolean).join(" – ")}</p>
                </div>
              ))}
            </div>
          </section>
        )}
        {projects.length > 0 && (
          <section className="mt-5">
            <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">Projects & collaborations</h2>
            <div className="space-y-2.5">
              {projects.map((c) => (
                <div key={c.id}>
                  <p className="text-[13px] font-semibold text-zinc-900">
                    {c.title}{c.role ? ` · ${c.role}` : ""}
                    <span className="ml-1 text-[11px] font-normal text-zinc-500">{categoryOf(c)}</span>
                  </p>
                  {c.description && <p className="text-[13px] leading-relaxed text-zinc-700">{c.description}</p>}
                  {c.url && <p className="text-[11px] text-zinc-500">{c.url}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
        {writingItems.length > 0 && (
          <section className="mt-5">
            <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">Writing & research</h2>
            <div className="space-y-2">
              {writingItems.map((w) => (
                <div key={w.id}>
                  <p className="text-[13px] font-semibold text-zinc-900">
                    {w.title}
                    {w.published_at ? <span className="ml-2 text-[11px] font-normal text-zinc-500">{w.published_at}</span> : null}
                  </p>
                  {w.description && <p className="text-[13px] leading-relaxed text-zinc-700">{w.description}</p>}
                  {w.url && <p className="text-[11px] text-zinc-500">{w.url}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
        {docs.length > 0 && (
          <section className="mt-5">
            <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">Credentials</h2>
            <ul className="space-y-1">
              {docs.map((d) => (
                <li key={d.id} className="text-[13px] text-zinc-700">
                  <span className="font-semibold">{d.title}</span>{d.issuer ? ` · ${d.issuer}` : ""}
                </li>
              ))}
            </ul>
          </section>
        )}
        <p className="mt-8 text-[10px] text-zinc-400">Generated from Pow3Folio · pow3folio.vercel.app/{p.username}</p>
      </article>
    </div>
  );
}
