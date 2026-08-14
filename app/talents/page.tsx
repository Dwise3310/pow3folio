import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ThemeToggle from "@/components/theme/ThemeToggle";
import TalentsDiscovery, { type TalentCard } from "@/components/talents/TalentsDiscovery";

export const metadata = {
  title: "View talents",
  description:
    "Discover Web3 builders with real proof of work. Filter by role, skills, open to work and featured profiles.",
};

type RawProfile = {
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  open_to_work: boolean | null;
  skills: unknown;
  location_country: string | null;
  location_region: string | null;
  is_featured?: boolean | null;
  updated_at?: string | null;
};

function parseSkills(raw: unknown): { name: string; description?: string }[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw
    .map((s) => {
      if (typeof s === "string") {
        const t = s.trim();
        if (t.startsWith("{") && t.includes("name")) {
          try {
            const p = JSON.parse(t) as { name?: string; description?: string };
            if (p?.name) return { name: String(p.name), description: p.description };
          } catch {
            /* ignore */
          }
        }
        return { name: t };
      }
      if (s && typeof s === "object" && "name" in (s as object)) {
        const o = s as { name?: string; description?: string };
        return { name: String(o.name || ""), description: o.description };
      }
      return { name: "" };
    })
    .filter((s) => s.name);
}

function roleHint(skills: { name: string }[], bio: string | null): string | null {
  const first = skills[0]?.name;
  if (first) return first;
  if (bio) {
    const short = bio.split(/[.|]/)[0]?.trim();
    if (short && short.length < 60) return short;
  }
  return null;
}

export default async function TalentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Prefer featured first when column exists; always public only
  let profiles: RawProfile[] | null = null;

  const withFeatured = await supabase
    .from("profiles")
    .select(
      "username, display_name, bio, avatar_url, open_to_work, skills, location_country, location_region, is_featured, updated_at"
    )
    .eq("is_public", true)
    .not("username", "is", null)
    .order("is_featured", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(60);

  if (withFeatured.error) {
    const fallback = await supabase
      .from("profiles")
      .select(
        "username, display_name, bio, avatar_url, open_to_work, skills, location_country, location_region, updated_at"
      )
      .eq("is_public", true)
      .not("username", "is", null)
      .order("updated_at", { ascending: false })
      .limit(60);
    profiles = (fallback.data as RawProfile[] | null) ?? [];
  } else {
    profiles = (withFeatured.data as RawProfile[] | null) ?? [];
  }

  const talents: TalentCard[] = (profiles ?? []).map((p) => {
    const skills = parseSkills(p.skills);
    const location =
      p.location_country && p.location_region
        ? `${p.location_region}, ${p.location_country}`
        : p.location_country || p.location_region || null;
    return {
      username: p.username,
      display_name: p.display_name,
      bio: p.bio,
      avatar_url: p.avatar_url,
      open_to_work: !!p.open_to_work,
      skills,
      location,
      is_featured: !!p.is_featured,
      role_hint: roleHint(skills, p.bio),
    };
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="container-app flex h-14 items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
              <span className="text-xs font-bold">P3</span>
            </div>
            <span className="font-semibold truncate text-sm sm:text-base">
              Pow<span className="text-primary">3</span>Folio
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <Link href="/dashboard" className="btn-primary text-xs px-3 py-1.5">
                Dashboard
              </Link>
            ) : (
              <Link href="/signup" className="btn-primary text-xs px-3 py-1.5">
                Get started
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container-app max-w-5xl py-6 sm:py-8">
        <div className="mb-5 sm:mb-6">
          <p className="text-[11px] font-medium uppercase tracking-wider text-foreground-subtle">
            Discovery
          </p>
          <h1 className="mt-0.5 text-xl sm:text-2xl font-bold tracking-tight">View talents</h1>
          <p className="mt-1.5 max-w-lg text-sm text-foreground-muted">
            Find Web3 builders by role, skills and proof of work. Featured profiles rise first.
          </p>
        </div>

        {talents.length === 0 ? (
          <div className="card py-10 text-center">
            <p className="text-sm text-foreground-muted">
              No public profiles yet. Be the first talent on Pow3Folio.
            </p>
            <Link href="/signup" className="btn-primary mt-4 inline-flex text-sm">
              Create your portfolio
            </Link>
          </div>
        ) : (
          <TalentsDiscovery talents={talents} />
        )}
      </main>
    </div>
  );
}
