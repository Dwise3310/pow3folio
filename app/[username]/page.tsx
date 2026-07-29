import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Writing } from "@/types/database";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("display_name, bio, username")
    .eq("username", username.toLowerCase())
    .eq("is_public", true)
    .maybeSingle();

  if (!data) {
    return { title: "Profile not found" };
  }

  return {
    title: data.display_name || data.username,
    description: data.bio || `${data.username} on Pow3Folio`,
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username.toLowerCase())
    .eq("is_public", true)
    .maybeSingle();

  if (!profile) {
    notFound();
  }

  const p = profile as Profile;

  const { data: writings } = await supabase
    .from("writings")
    .select("*")
    .eq("user_id", p.id)
    .eq("is_visible", true)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  const writingItems = (writings as Writing[]) ?? [];

  const socials = [
    { label: "X", href: p.x_url },
    { label: "Discord", href: p.discord_url },
    { label: "Telegram", href: p.telegram_url },
    { label: "GitHub", href: p.github_url },
    { label: "Website", href: p.website_url },
  ].filter((s) => s.href);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60">
        <div className="container-app flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary">
              <span className="text-xs font-bold">P3</span>
            </div>
            <span className="font-semibold">
              Pow<span className="text-primary">3</span>Folio
            </span>
          </Link>
        </div>
      </header>

      <main className="container-app max-w-3xl py-10">
        <div className="mb-6 h-28 rounded-xl bg-gradient-to-r from-primary/20 via-surface-elevated to-accent/10" />

        <div className="-mt-14 flex flex-col items-start gap-4 sm:flex-row sm:items-end">
          <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-background bg-surface-elevated">
            {p.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.avatar_url}
                alt={p.display_name || p.username}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-foreground-subtle">
                {(p.display_name || p.username).charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1 pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {p.display_name || p.username}
              </h1>
              {p.open_to_work && (
                <span className="badge-open">Open to opportunities</span>
              )}
            </div>
            <p className="text-sm text-foreground-muted">@{p.username}</p>
            {p.bio && <p className="mt-2 text-sm text-foreground-muted">{p.bio}</p>}
          </div>
        </div>

        {p.long_bio && (
          <div className="mt-8 card">
            <h2 className="text-sm font-medium text-foreground-muted">About</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
              {p.long_bio}
            </p>
          </div>
        )}

        {(socials.length > 0 || p.wallet_address || p.ens_name) && (
          <div className="mt-6 card">
            <h2 className="text-sm font-medium text-foreground-muted">Links & identity</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-xs"
                >
                  {s.label}
                </a>
              ))}
            </div>
            {p.ens_name && (
              <p className="mt-3 text-sm text-foreground-muted">ENS: {p.ens_name}</p>
            )}
            {p.wallet_address && (
              <p className="mt-1 break-all font-mono text-xs text-foreground-subtle">
                {p.wallet_address}
              </p>
            )}
          </div>
        )}

        <div className="mt-10 space-y-6">
          <section>
            <h2 className="mb-3 text-lg font-semibold">Writing</h2>
            {writingItems.length === 0 ? (
              <div className="card text-sm text-foreground-subtle">No writings yet.</div>
            ) : (
              <div className="space-y-3">
                {writingItems.map((w) => (
                  <a
                    key={w.id}
                    href={w.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="card block transition-colors hover:border-primary/40"
                  >
                    <h3 className="font-medium text-primary">{w.title}</h3>
                    {w.description && (
                      <p className="mt-1 text-sm text-foreground-muted line-clamp-2">
                        {w.description}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-foreground-subtle">
                      {w.published_at && <span>{w.published_at}</span>}
                      {(w.tags ?? []).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-surface-elevated px-2 py-0.5"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </section>

          {["Trading Record", "Community"].map((section) => (
            <section key={section}>
              <h2 className="mb-3 text-lg font-semibold">{section}</h2>
              <div className="card text-sm text-foreground-subtle">
                No items yet — coming soon from the dashboard.
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
