import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type {
  Profile,
  Writing,
  Trade,
  TradeUpdate,
  CommunityItem,
  Airdrop,
} from "@/types/database";
import type { Metadata } from "next";
import ThemeToggle from "@/components/theme/ThemeToggle";
import ShareButton from "@/components/writing/ShareButton";
import TradeCard from "@/components/trading/TradeCard";
import CommunityCard from "@/components/community/CommunityCard";
import AirdropCard from "@/components/airdrops/AirdropCard";
import ImageLightbox from "@/components/ui/ImageLightbox";
import EmailChip from "@/components/ui/EmailChip";

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

  const [{ data: writings }, { data: trades }, { data: community }, { data: airdrops }] =
    await Promise.all([
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
      supabase
        .from("community_items")
        .select("*")
        .eq("user_id", p.id)
        .eq("is_visible", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),
      supabase
        .from("airdrops")
        .select("*")
        .eq("user_id", p.id)
        .eq("is_visible", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),
    ]);

  const writingItems = (writings as Writing[]) ?? [];
  const tradeItems = (trades as Trade[]) ?? [];
  const communityItems = (community as CommunityItem[]) ?? [];
  const airdropItems = (airdrops as Airdrop[]) ?? [];

  const tradeIds = tradeItems.map((t) => t.id);
  const updatesByTrade: Record<string, TradeUpdate[]> = {};

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
  const arkhamUrl = p.wallet_address
    ? `https://arkm.com/explorer/address/${p.wallet_address}`
    : null;

  const socials = [
    { label: "X", href: p.x_url },
    { label: "GitHub", href: p.github_url },
    { label: "Telegram", href: p.telegram_url },
    { label: "Website", href: p.website_url },
  ].filter((s) => s.href);

  const publicEmails: string[] = [];
  if (p.show_primary_email && p.primary_email) publicEmails.push(p.primary_email);
  if (p.show_secondary_email && p.secondary_email) publicEmails.push(p.secondary_email);

  const locationLabel =
    p.location_country && p.location_region
      ? `${p.location_region}, ${p.location_country}`
      : p.location_country || p.location_region || null;

  const hasContacts =
    socials.length > 0 ||
    !!p.wallet_address ||
    !!p.ens_name ||
    publicEmails.length > 0;

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

      <main className="container-app max-w-5xl py-5 sm:py-8">
        <div className="relative animate-fade-in">
          <div className="h-32 sm:h-44 md:h-52 overflow-hidden rounded-xl border border-border bg-surface-elevated">
            {p.banner_url ? (
              <ImageLightbox
                src={p.banner_url}
                alt="Profile banner"
                className="h-full w-full"
                imgClassName="h-full w-full object-cover"
                rounded="xl"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-r from-primary/20 via-surface-elevated to-accent/10" />
            )}
          </div>

          <div className="absolute -bottom-10 left-4 sm:-bottom-12 sm:left-6">
            <div className="h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-full border-4 border-background bg-surface-elevated shadow-md">
              {p.avatar_url ? (
                <ImageLightbox
                  src={p.avatar_url}
                  alt={p.display_name || p.username}
                  className="h-full w-full"
                  imgClassName="h-full w-full object-cover"
                  rounded="full"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-foreground-subtle">
                  {(p.display_name || p.username).charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-12 sm:mt-14 space-y-1.5 pl-1 animate-slide-up">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight break-words">
              {p.display_name || p.username}
            </h1>
            {p.open_to_work && (
              <span className="badge-open">
                <span className="badge-open-dot" aria-hidden />
                Open to opportunities
              </span>
            )}
          </div>
          <p className="text-sm text-foreground-muted">@{p.username}</p>
          {p.bio && (
            <p className="max-w-2xl text-sm text-foreground-muted break-words">{p.bio}</p>
          )}
          {locationLabel && (
            <p className="flex items-center gap-1.5 text-xs text-foreground-subtle">
              <span className="location-dot" aria-hidden />
              {locationLabel}
            </p>
          )}
        </div>

        {hasContacts && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 pl-1 animate-slide-up">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href!}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-border bg-surface-elevated px-2.5 py-1 text-xs font-medium transition-all hover:border-primary/40 hover:text-primary hover:scale-105"
              >
                {s.label}
              </a>
            ))}
            {publicEmails.map((em) => (
              <EmailChip key={em} email={em} />
            ))}
            {p.ens_name && (
              <span className="rounded-full border border-border px-2.5 py-1 text-xs text-foreground-muted">
                {p.ens_name}
              </span>
            )}
            {p.wallet_address && arkhamUrl && (
              <a
                href={arkhamUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="View on Arkham"
                className="rounded-full border border-border px-2.5 py-1 font-mono text-[10px] text-foreground-subtle transition-all hover:border-primary/40 hover:text-primary"
              >
                {p.wallet_address.slice(0, 6)}…{p.wallet_address.slice(-4)}
              </a>
            )}
          </div>
        )}

        {p.long_bio && (
          <div className="mt-4 card p-3 sm:p-4 animate-fade-in">
            <h2 className="text-xs font-medium uppercase tracking-wide text-foreground-subtle">About</h2>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed break-words">
              {p.long_bio}
            </p>
          </div>
        )}

        <div className="mt-6 sm:mt-8 space-y-6">
          <section className="animate-fade-in">
            <h2 className="mb-3 text-lg font-semibold">Writing</h2>
            {writingItems.length === 0 ? (
              <div className="card text-sm text-foreground-subtle">No writings yet.</div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {writingItems.map((w) => (
                  <article
                    key={w.id}
                    className="card flex flex-col overflow-hidden p-0 transition-all duration-200 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <a href={w.url} target="_blank" rel="noopener noreferrer" className="block">
                      <div className="aspect-[16/10] w-full bg-surface-elevated">
                        {w.thumbnail_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={w.thumbnail_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-foreground-subtle">
                            No thumbnail
                          </div>
                        )}
                      </div>
                    </a>
                    <div className="flex flex-1 flex-col p-3">
                      <a
                        href={w.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary hover:underline line-clamp-2 text-sm"
                      >
                        {w.title}
                      </a>
                      {w.description && (
                        <p className="mt-1 text-xs text-foreground-muted line-clamp-2">{w.description}</p>
                      )}
                      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                        <div className="flex min-w-0 flex-wrap gap-1 text-[11px] text-foreground-subtle">
                          {w.published_at && <span>{w.published_at}</span>}
                          {(w.tags ?? []).slice(0, 2).map((tag) => (
                            <span key={tag} className="rounded-full bg-surface-elevated px-1.5 py-0.5">
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

          <section className="animate-fade-in">
            <h2 className="mb-3 text-lg font-semibold">Trading Record</h2>
            {tradeItems.length === 0 ? (
              <div className="card text-sm text-foreground-subtle">No trades yet.</div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

          <section className="animate-fade-in">
            <h2 className="mb-3 text-lg font-semibold">Community</h2>
            {communityItems.length === 0 ? (
              <div className="card text-sm text-foreground-subtle">No community contributions yet.</div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {communityItems.map((c) => (
                  <CommunityCard key={c.id} item={c} profileUrl={profileUrl} />
                ))}
              </div>
            )}
          </section>

          <section className="animate-fade-in">
            <h2 className="mb-3 text-lg font-semibold">Airdrops</h2>
            {airdropItems.length === 0 ? (
              <div className="card text-sm text-foreground-subtle">No airdrops yet.</div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {airdropItems.map((a) => (
                  <AirdropCard key={a.id} item={a} profileUrl={profileUrl} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
