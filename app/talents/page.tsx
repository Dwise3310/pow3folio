import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ThemeToggle from "@/components/theme/ThemeToggle";

export const metadata = {
  title: "View talents",
  description:
    "Discover Web3 builders and talents with real proof of work: trading, writing, community and more.",
};

type TalentRow = {
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  open_to_work: boolean | null;
  skills: string[] | null;
};

export default async function TalentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Public profiles only. Featured column may not exist yet; fall back to recent public
  const { data: profiles } = await supabase
    .from("profiles")
    .select("username, display_name, bio, avatar_url, open_to_work, skills")
    .eq("is_public", true)
    .not("username", "is", null)
    .order("updated_at", { ascending: false })
    .limit(24);

  const talents = (profiles as TalentRow[] | null) ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="container-app flex h-14 sm:h-16 items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <span className="text-sm font-bold">P3</span>
            </div>
            <span className="font-semibold truncate">
              Pow<span className="text-primary">3</span>Folio
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <Link href="/dashboard" className="btn-primary text-xs sm:text-sm">
                Dashboard
              </Link>
            ) : (
              <Link href="/signup" className="btn-primary text-xs sm:text-sm">
                Get started
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container-app py-8 sm:py-12 max-w-5xl">
        <div className="mb-8 sm:mb-10">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            Discovery
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight">
            View talents
          </h1>
          <p className="mt-2 max-w-xl text-sm text-foreground-muted">
            Public builders with proof of work profiles. Search and filters land
            next. For now, browse recent public talents.
          </p>
        </div>

        {talents.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-foreground-muted text-sm">
              No public profiles yet. Be the first talent on Pow3Folio.
            </p>
            <Link href="/signup" className="btn-primary mt-4 inline-flex">
              Create your portfolio
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {talents.map((t) => {
              const skills = (t.skills ?? []).filter(Boolean).slice(0, 4);
              return (
                <Link
                  key={t.username}
                  href={`/${t.username}`}
                  className="card group flex flex-col p-4 transition-all duration-200 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-glow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-border bg-surface-elevated">
                      {t.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={t.avatar_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-foreground-subtle">
                          {(t.display_name || t.username).charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium truncate group-hover:text-primary transition-colors">
                          {t.display_name || t.username}
                        </p>
                        {t.open_to_work && (
                          <span className="badge-open text-[10px]">
                            <span className="badge-open-dot" aria-hidden />
                            Open
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-foreground-subtle truncate">
                        @{t.username}
                      </p>
                    </div>
                  </div>
                  {t.bio && (
                    <p className="mt-3 text-xs text-foreground-muted line-clamp-2">
                      {t.bio}
                    </p>
                  )}
                  {skills.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {skills.map((s) => (
                        <span
                          key={s}
                          className="rounded-full bg-surface-elevated px-2 py-0.5 text-[10px] text-foreground-muted"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="mt-auto pt-3 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    View profile →
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
