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
  Collectible,
  Credential,
  Skill,
  WorkExperience,
  Education,
  TradingPlatform,
} from "@/types/database";
import type { Metadata } from "next";
import ThemeToggle from "@/components/theme/ThemeToggle";
import ImageLightbox from "@/components/ui/ImageLightbox";
import EmailChip from "@/components/ui/EmailChip";
import PublicProfileTabs from "@/components/profile/PublicProfileTabs";
import PublicProfileCta from "@/components/profile/PublicProfileCta";
import ScoreRings from "@/components/profile/ScoreRings";
import { computeScores } from "@/lib/ai/scores";

type Props = {
  params: Promise<{ username: string }>;
};

function normalizeSkills(raw: Profile["skills"]): Skill[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw
    .map((s) => {
      if (typeof s === "string") {
        const trimmed = s.trim();
        if (trimmed.startsWith("{") && trimmed.includes("name")) {
          try {
            const parsed = JSON.parse(trimmed) as { name?: string; description?: string };
            if (parsed?.name) {
              return {
                name: String(parsed.name).slice(0, 60),
                description: String(parsed.description || "").slice(0, 250),
              };
            }
          } catch {
            /* fall through */
          }
        }
        return { name: trimmed.slice(0, 60), description: "" };
      }
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

function absoluteUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const t = url.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t.replace(/^\/+/, "")}`;
}

function normalizeWork(list: WorkExperience[] | null | undefined): WorkExperience[] {
  if (!Array.isArray(list)) return [];
  return list.map((w) => ({ ...w, url: absoluteUrl(w.url) }));
}

function normalizeEducation(list: Education[] | null | undefined): Education[] {
  if (!Array.isArray(list)) return [];
  return list.map((e) => ({ ...e, url: absoluteUrl(e.url) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("display_name, bio, username")
    .eq("username", username.toLowerCase())
    .eq("is_public", true)
    .maybeSingle();
  if (!data) return { title: "Profile not found" };
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
  if (!profile) notFound();

  const p = profile as Profile;
  const showWriting = p.show_writing !== false;
  const showTrading = p.show_trading !== false;
  const showCommunity = p.show_community !== false;
  const showAirdrops = p.show_airdrops === true;
  const showOnchain = p.show_nfts !== false;
  const showCredentials = p.show_credentials !== false;

  const { data: { user } } = await supabase.auth.getUser();
  const isOwner = !!user && user.id === p.id;

  const [
    { data: writings },
    { data: trades },
    { data: community },
    { data: airdrops },
    { data: collectibles },
    { data: credentials },
  ] = await Promise.all([
    showWriting ? supabase.from("writings").select("*").eq("user_id", p.id).eq("is_visible", true).order("sort_order", { ascending: true }).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    showTrading ? supabase.from("trades").select("*").eq("user_id", p.id).eq("is_visible", true).order("sort_order", { ascending: true }).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    showCommunity ? supabase.from("community_items").select("*").eq("user_id", p.id).eq("is_visible", true).order("sort_order", { ascending: true }).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    showAirdrops ? supabase.from("airdrops").select("*").eq("user_id", p.id).eq("is_visible", true).order("sort_order", { ascending: true }).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    showOnchain ? supabase.from("collectibles").select("*").eq("user_id", p.id).eq("is_visible", true).order("sort_order", { ascending: true }).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    showCredentials ? supabase.from("credentials").select("*").eq("user_id", p.id).eq("is_visible", true).order("sort_order", { ascending: true }).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
  ]);

  const writingItems = (writings as Writing[]) ?? [];
  const tradeItems = (trades as Trade[]) ?? [];
  const communityItems = (community as CommunityItem[]) ?? [];
  const airdropItems = (airdrops as Airdrop[]) ?? [];
  const collectibleItems = (collectibles as Collectible[]) ?? [];
  const credentialItems = (credentials as Credential[]) ?? [];

  const tradeIds = tradeItems.map((t) => t.id);
  const updatesByTrade: Record<string, TradeUpdate[]> = {};
  if (tradeIds.length > 0) {
    const { data: updates } = await supabase.from("trade_updates").select("*").in("trade_id", tradeIds).order("created_at", { ascending: true });
    for (const u of (updates as TradeUpdate[]) ?? []) {
      if (!updatesByTrade[u.trade_id]) updatesByTrade[u.trade_id] = [];
      updatesByTrade[u.trade_id].push(u);
    }
  }

  const profileUrl = `https://pow3folio.vercel.app/${p.username}`;
  const arkhamUrl = p.wallet_address ? `https://arkm.com/explorer/address/${p.wallet_address}` : null;
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
  const skillList = normalizeSkills(p.skills);
  const workExp = normalizeWork(p.work_experience as WorkExperience[]);
  const education = normalizeEducation(p.education as Education[]);
  const platforms = (p.trading_platforms as TradingPlatform[]) ?? [];
  const scores = computeScores({
    profile: p,
    writings: writingItems,
    trades: tradeItems,
    community: communityItems,
    airdrops: airdropItems,
    nfts: collectibleItems,
    credentials: credentialItems,
  });
  const hasContacts = socials.length > 0 || !!p.wallet_address || !!p.ens_name || publicEmails.length > 0;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <header className="border-b border-border/60">
        <div className="container-app flex h-14 items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
              <span className="text-xs font-bold">P3</span>
            </div>
            <span className="font-semibold truncate">Pow<span className="text-primary">3</span>Folio</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="container-app max-w-5xl py-4 sm:py-5 px-3 sm:px-4">
        <div className="relative animate-fade-in">
          <div className="h-28 sm:h-40 md:h-44 overflow-hidden rounded-xl border border-border bg-surface-elevated">
            {p.banner_url ? (
              <ImageLightbox src={p.banner_url} alt="Profile banner" className="h-full w-full" imgClassName="h-full w-full object-cover" rounded="xl" />
            ) : (
              <div className="h-full w-full bg-gradient-to-r from-primary/20 via-surface-elevated to-accent/10" />
            )}
          </div>
          <div className="absolute -bottom-10 left-3 sm:-bottom-11 sm:left-5">
            <div className="h-[4.5rem] w-[4.5rem] sm:h-[5.25rem] sm:w-[5.25rem] overflow-hidden rounded-full border-4 border-background bg-surface-elevated shadow-md">
              {p.avatar_url ? (
                <ImageLightbox src={p.avatar_url} alt={p.display_name || p.username} className="h-full w-full" imgClassName="h-full w-full object-cover" rounded="full" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-foreground-subtle">
                  {(p.display_name || p.username).charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="mt-12 sm:mt-13 flex items-start justify-between gap-3 pl-0.5 animate-slide-up">
          <div className="min-w-0 flex-1 space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight break-words">{p.display_name || p.username}</h1>
            <p className="text-sm text-foreground-muted">@{p.username}</p>
            {p.open_to_work && (
              <span className="badge-open">
                <span className="badge-open-dot" aria-hidden />
                Open to opportunities
              </span>
            )}
          </div>
          <ScoreRings username={p.username} initialProfile={scores.profileScore} initialBuilder={scores.builderScore} />
        </div>
        {(p.bio || locationLabel) && (
          <div className="mt-2 space-y-1 pl-0.5 animate-slide-up">
            {p.bio && <p className="w-full text-sm text-foreground-muted break-words leading-relaxed">{p.bio}</p>}
            {locationLabel && (
              <p className="flex items-center gap-1.5 text-xs text-foreground-subtle">
                <span className="location-dot" aria-hidden />
                {locationLabel}
              </p>
            )}
          </div>
        )}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 animate-slide-up">
          {hasContacts && (
            <>
              {socials.map((s) => (
                <a key={s.label} href={s.href!} target="_blank" rel="noopener noreferrer" className="rounded-full border border-border bg-surface-elevated px-2.5 py-1 text-xs font-medium transition-all hover:border-primary/40 hover:text-primary">{s.label}</a>
              ))}
              {publicEmails.map((em) => (
                <EmailChip key={em} email={em} />
              ))}
              {p.ens_name && <span className="rounded-full border border-border px-2.5 py-1 text-xs text-foreground-muted">{p.ens_name}</span>}
              {p.wallet_address && arkhamUrl && (
                <a href={arkhamUrl} target="_blank" rel="noopener noreferrer" title="View on Arkham" className="rounded-full border border-border px-2.5 py-1 font-mono text-[10px] text-foreground-subtle transition-all hover:border-primary/40 hover:text-primary">
                  {p.wallet_address.slice(0, 6)}…{p.wallet_address.slice(-4)}
                </a>
              )}
            </>
          )}
        </div>
        <PublicProfileTabs
          profileUrl={profileUrl}
          longBio={p.long_bio}
          skills={skillList}
          workExperience={workExp}
          education={education}
          tradingPlatforms={platforms}
          credentials={credentialItems}
          writings={writingItems}
          trades={tradeItems}
          updatesByTrade={updatesByTrade}
          community={communityItems}
          airdrops={airdropItems}
          nfts={collectibleItems}
          walletAddress={p.wallet_address}
          ensName={p.ens_name}
          arkhamUrl={arkhamUrl}
          showWriting={showWriting}
          showTrading={showTrading}
          showCommunity={showCommunity}
          showAirdrops={showAirdrops}
          showOnchain={showOnchain}
        />
        <PublicProfileCta isOwner={isOwner} />
      </main>
    </div>
  );
}
