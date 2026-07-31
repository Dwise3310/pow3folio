import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Writing, Trade, TradeUpdate } from "@/types/database";
import type { Metadata } from "next";
import ThemeToggle from "@/components/theme/ThemeToggle";
import ShareButton from "@/components/writing/ShareButton";
import TradeCard from "@/components/trading/TradeCard";

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

  const [{ data: writings }, { data: trades }] = await Promise.all([
    supabase
      .from("writings")
      .select("*")
      .eq("user_id", p.id)
      .eq("is_visible", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase
      .from("trades")
      .select("*")
      .eq("user_id", p.id)
      .eq("is_visible", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
  ]);

  const writingItems = (writings as Writing[]) ?? [];
  const tradeItems = (trades as Trade[]) ?? [];

  const tradeIds = tradeItems.map((t) => t.id);
  let updatesByTrade: Record<string, TradeUpdate[]> = {};

  if (tradeIds.length > 0) {
    const { data: updates } = await supabase
      .from("trade_updates")
      .select("*")
      .in("trade_id", tradeIds)
      .order("created_at", { ascending: true });

    for (const u of (updates as TradeUpdate[]) ?? []) {
      if (!updatesByTrade[u.trade_id]) updatesByTrade[u.trade_id] = [];
      updatesByTrade[u.trade_id].push(u);
    }
  }

  const profileUrl = `https://pow3folio.vercel.app/${p.username}`;

  const socials = [
    { label: "X", href: p.x_url },
    { label: "Discord", href: p.discord_url },
    { label: "Telegram", href: p.telegram_url },
    { label: "GitHub", href: p.github_url },
    { label: "Website", href: p.website_url },
  ].filter((s) => s.href);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="container-app flex h-14 items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
              <span className="text-xs font-bold">P3</span>
            </div>
            <span className="font-semibold truncate">
              Pow<span className="text-primary">3</span>Folio
            </span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="container-app max-w-5xl py-6 sm:py-10">
        <div className="relative">
          <div className="h-32 sm:h-44 md:h-52 overflow-hidden rounded-xl border border-border bg-surface-elevated">
            {p.banner_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.banner_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-to-r from-primary/20 via-surface-elevated to-accent/10" />
            )}
          </div>

          <div className="absolute -bottom-10 left-4 sm:-bottom-12 sm:left-6">
            <div className="h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-full border-4 border-background bg-surface-elevated shadow-md">
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
          </div>
        </div>

        <div className="mt-12 sm:mt-14 pl-1 sm:pl-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight break-words text-foreground">
              {p.display_name || p.username}
            </h1>
            {p.open_to_work && (
              <span className="badge-open">Open to opportunities</span>
            )}
          </div>
          <p className="text-sm text-foreground-muted">@{p.username}</p>
          {p.bio && (
            <p className="mt-2 max-w-2xl text-sm text-foreground-muted break-words">
              {p.bio}
            </p>
          )}
        </div>

        {p.long_bio && (
          <div className="mt-6 sm:mt-8 card">
            <h2 className="text-sm font-medium text-foreground-muted">About</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed break-words">
              {p.long_bio}
            </p>
          </div>
        )}

        {(socials.length > 0 || p.wallet_address || p.ens_name) && (
          <div className="mt-4 sm:mt-6 card">
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

        <div className="mt-8 sm:mt-10 space-y-8">
          <section>
            <h2 className="mb-4 text-lg font-semibold">Writing</h2>
            {writingItems.length === 0 ? (
              <div className="card text-sm text-foreground-subtle">No writings yet.</div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {writingItems.map((w) => (
                  <article
                    key={w.id}
                    className="card flex flex-col overflow-hidden p-0 transition-colors hover:border-primary/40"
                  >
                    <a href={w.url} target="_blank" rel="noopener noreferrer" className="block">
                      <div className="aspect-[16/10] w-full bg-surface-elevated">
                        {w.thumbnail_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={w.thumbnail_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-foreground-subtle">
                            No thumbnail
                          </div>
                        )}
                      </div>
                    </a>
                    <div className="flex flex-1 flex-col p-3 sm:p-4">
                      <a
                        href={w.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary hover:underline line-clamp-2"
                      >
                        {w.title}
                      </a>
                      {w.description && (
                        <p className="mt-1 text-sm text-foreground-muted line-clamp-2">
                          {w.description}
                        </p>
                      )}
                      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                        <div className="flex min-w-0 flex-wrap gap-1 text-xs text-foreground-subtle">
                          {w.published_at && <span>{w.published_at}</span>}
                          {(w.tags ?? []).slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-surface-elevated px-2 py-0.5"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <ShareButton title={w.title} url={w.url} />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold">Trading Record</h2>
            {tradeItems.length === 0 ? (
              <div className="card text-sm text-foreground-subtle">No trades yet.</div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tradeItems.map((t) => (
                  <TradeCard
                    key={t.id}
                    trade={t}
                    updates={updatesByTrade[t.id] ?? []}
                    profileUrl={profileUrl}
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">Community</h2>
            <div className="card text-sm text-foreground-subtle">
              No items yet — coming soon from the dashboard.
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
