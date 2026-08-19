"use client";

import { useEffect, useState } from "react";
import ShareButton from "@/components/writing/ShareButton";
import TradeCard from "@/components/trading/TradeCard";
import CommunityCard from "@/components/community/CommunityCard";
import AirdropCard from "@/components/airdrops/AirdropCard";
import PlatformLogo from "@/components/ui/PlatformLogo";
import TradeImageCarousel from "@/components/trading/TradeImageCarousel";
import CredentialThumb from "@/components/profile/CredentialThumb";
import OnchainSection from "@/components/profile/OnchainSection";
import type {
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

type TabId = "about" | "projects" | "writing" | "trading" | "airdrops" | "onchain";

type Props = {
  profileUrl: string;
  longBio: string | null;
  skills: Skill[];
  workExperience: WorkExperience[];
  education: Education[];
  tradingPlatforms: TradingPlatform[];
  credentials: Credential[];
  writings: Writing[];
  trades: Trade[];
  updatesByTrade: Record<string, TradeUpdate[]>;
  community: CommunityItem[];
  airdrops: Airdrop[];
  nfts: Collectible[];
  walletAddress: string | null;
  ensName: string | null;
  arkhamUrl: string | null;
  showWriting: boolean;
  showTrading: boolean;
  showCommunity: boolean;
  showAirdrops: boolean;
  showOnchain: boolean;
};

export default function PublicProfileTabs({
  profileUrl,
  longBio,
  skills,
  workExperience,
  education,
  tradingPlatforms,
  credentials,
  writings,
  trades,
  updatesByTrade,
  community,
  airdrops,
  nfts,
  walletAddress,
  ensName,
  arkhamUrl,
  showWriting,
  showTrading,
  showCommunity,
  showAirdrops,
  showOnchain,
}: Props) {
  const allTabs: { id: TabId; label: string; show: boolean }[] = [
    { id: "about", label: "About", show: true },
    { id: "projects", label: "Projects / Collab", show: showCommunity },
    { id: "writing", label: "Technical Writing / Research", show: showWriting },
    { id: "trading", label: "Trading Record", show: showTrading },
    { id: "onchain", label: "Onchain Stats", show: showOnchain },
    { id: "airdrops", label: "Airdrops", show: showAirdrops },
  ];
  const tabs = allTabs.filter((t) => t.show);
  const [active, setActive] = useState<TabId>("about");
  const [animKey, setAnimKey] = useState(0);
  const [skillPopup, setSkillPopup] = useState<Skill | null>(null);

  useEffect(() => {
    if (!skillPopup) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [skillPopup]);

  function selectTab(id: TabId) {
    if (id === active) return;
    setActive(id);
    setAnimKey((k) => k + 1);
  }

  return (
    <div className="mt-5 sm:mt-6">
      <div className="sticky top-0 z-20 -mx-1 border-b border-border/80 bg-background/95 backdrop-blur-sm">
        <div className="flex gap-0 overflow-x-auto scrollbar-none px-1" style={{ WebkitOverflowScrolling: "touch" }} role="tablist">
          {tabs.map((t) => {
            const isActive = active === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => selectTab(t.id)}
                className={`relative shrink-0 px-3.5 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive ? "text-foreground" : "text-foreground-muted hover:text-foreground"
                }`}
              >
                {t.label}
                {isActive && <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>
      </div>

      <div key={animKey} className="tab-panel-enter pt-4 pb-8">
        {active === "about" && (
          <div className="space-y-5">
            <p className="text-xs sm:text-sm text-foreground-muted leading-relaxed rounded-lg border border-border/60 bg-surface/40 px-3 py-2.5">
              Skills, background, work history, education and credentials. Tap a skill chip to read the full brief. Company links on experience open the project or employer page.
            </p>
            {skills.length > 0 && (
              <div>
                <h3 className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-foreground-subtle">Skills / Service pillars</h3>
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((skill) => (
                    <button
                      key={skill.name}
                      type="button"
                      onClick={() => setSkillPopup(skill)}
                      className="inline-flex items-center rounded-full border border-primary bg-transparent px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10 transition-colors"
                    >
                      {skill.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {longBio && (
              <div>
                <h3 className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-foreground-subtle">About</h3>
                <p className="whitespace-pre-wrap text-sm leading-relaxed break-words text-foreground">{longBio}</p>
              </div>
            )}
            {workExperience.length > 0 && (
              <div>
                <h3 className="mb-2 text-[10px] font-medium uppercase tracking-wide text-foreground-subtle">Work experience</h3>
                <div className="space-y-4">
                  {workExperience.map((w, i) => (
                    <div key={w.id} className={i > 0 ? "pt-3 border-t border-border/50" : ""}>
                      <div className="min-w-0">
                        {w.url ? (
                          <a href={w.url} target="_blank" rel="noopener noreferrer" className="font-medium text-sm text-primary hover:underline">{w.company}</a>
                        ) : (
                          <p className="font-medium text-sm">{w.company}</p>
                        )}
                        <p className="text-xs text-foreground-muted mt-0.5">
                          {w.role} · {w.employment_type === "full-time" ? "Full-time" : "Part-time"}
                        </p>
                        <p className="text-xs text-foreground-subtle mt-0.5">
                          {w.start_date}{w.end_date ? ` → ${w.end_date}` : " → Present"}
                        </p>
                        {w.description && <p className="mt-1 text-xs text-foreground-muted leading-relaxed">{w.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {education.length > 0 && (
              <div>
                <h3 className="mb-2 text-[10px] font-medium uppercase tracking-wide text-foreground-subtle">Education</h3>
                <div className="space-y-4">
                  {education.map((e, i) => (
                    <div key={e.id} className={i > 0 ? "pt-3 border-t border-border/50" : ""}>
                      {e.url ? (
                        <a href={e.url} target="_blank" rel="noopener noreferrer" className="font-medium text-sm text-primary hover:underline">{e.institution}</a>
                      ) : (
                        <p className="font-medium text-sm">{e.institution}</p>
                      )}
                      <p className="text-xs text-foreground-muted mt-0.5">{[e.degree, e.field_of_study].filter(Boolean).join(" · ")}</p>
                      <p className="text-xs text-foreground-subtle mt-0.5">
                        {[e.country, e.start_year && e.end_year ? `${e.start_year} - ${e.end_year}` : e.start_year || e.end_year].filter(Boolean).join(" · ")}
                      </p>
                      {e.description && <p className="mt-1 text-xs text-foreground-muted">{e.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {credentials.length > 0 && (
              <div>
                <h3 className="mb-2 text-[10px] font-medium uppercase tracking-wide text-foreground-subtle">Docs & credentials</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {credentials.map((doc) => (
                    <a key={doc.id} href={doc.file_url} target="_blank" rel="noopener noreferrer" className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface/40 transition-all hover:border-primary/40">
                      <CredentialThumb doc={doc} className="aspect-[4/3] w-full" />
                      <div className="px-2.5 py-2 border-t border-border/60">
                        <p className="text-xs font-medium text-foreground line-clamp-2 break-words">{doc.title}</p>
                        {(doc.issuer || doc.file_name) && (
                          <p className="mt-0.5 text-[10px] text-foreground-subtle line-clamp-1">{[doc.issuer, doc.file_name].filter(Boolean).join(" · ")}</p>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
            {skills.length === 0 && !longBio && workExperience.length === 0 && education.length === 0 && credentials.length === 0 && (
              <div className="text-sm text-foreground-subtle">No about details yet.</div>
            )}
          </div>
        )}

        {active === "projects" && (
          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-foreground-muted leading-relaxed rounded-lg border border-border/60 bg-surface/40 px-3 py-2.5">
              This section showcases personal builds, partnerships and community work. Every card is something this talent shipped, co-built or ran.
            </p>
            {community.length === 0 ? (
              <div className="card text-sm text-foreground-subtle">No projects or collaborations yet.</div>
            ) : (
              <div className="tight-cards tight-cards-4">
                {community.map((c) => (
                  <CommunityCard key={c.id} item={c} profileUrl={profileUrl} />
                ))}
              </div>
            )}
          </div>
        )}

        {active === "writing" && (
          <div>
            {writings.length === 0 ? (
              <div className="card text-sm text-foreground-subtle">No technical writing or research yet.</div>
            ) : (
              <div className="tight-cards tight-cards-3">
                {writings.map((w) => {
                  const imgs = [w.thumbnail_url, w.image_url_2].filter((u): u is string => !!u);
                  return (
                    <article key={w.id} className="card flex h-auto w-full flex-col overflow-hidden p-0 transition-all duration-200 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-md">
                      {imgs.length > 0 && (
                        <TradeImageCarousel images={imgs} href={w.url} hideEmpty className="aspect-[16/10] w-full" />
                      )}
                      <div className="flex flex-col p-2.5 sm:p-3">
                        <a href={w.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline line-clamp-2 text-xs sm:text-sm">{w.title}</a>
                        {w.description && <p className="mt-1 text-[11px] sm:text-xs text-foreground-muted line-clamp-2">{w.description}</p>}
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="flex min-w-0 flex-wrap gap-1 text-[10px] text-foreground-subtle">{w.published_at && <span>{w.published_at}</span>}</div>
                          <ShareButton title={w.title} url={w.url} />
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {active === "trading" && (
          <div className="space-y-4">
            {tradingPlatforms.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tradingPlatforms.map((p) => (
                  <a key={p.id} href={p.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-elevated pl-1 pr-2.5 py-1 text-xs font-medium transition-all hover:border-primary/40 hover:text-primary">
                    <PlatformLogo name={p.name} size={18} className="h-[18px] w-[18px]" />
                    {p.name}
                  </a>
                ))}
              </div>
            )}
            {trades.length === 0 ? (
              <div className="card text-sm text-foreground-subtle">No trades yet.</div>
            ) : (
              <div className="tight-cards tight-cards-3">
                {trades.map((t) => (
                  <TradeCard key={t.id} trade={t} updates={updatesByTrade[t.id] ?? []} profileUrl={profileUrl} />
                ))}
              </div>
            )}
          </div>
        )}

        {active === "airdrops" && (
          <div>
            {airdrops.length === 0 ? (
              <div className="card text-sm text-foreground-subtle">No airdrops yet.</div>
            ) : (
              <div className="tight-cards tight-cards-3">
                {airdrops.map((a) => (
                  <AirdropCard key={a.id} item={a} profileUrl={profileUrl} />
                ))}
              </div>
            )}
          </div>
        )}

        {active === "onchain" && (
          <OnchainSection
            profileUrl={profileUrl}
            nfts={nfts}
            walletAddress={walletAddress}
            ensName={ensName}
            arkhamUrl={arkhamUrl}
          />
        )}
      </div>

      {skillPopup && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm" onClick={() => setSkillPopup(null)} role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex rounded-full border border-primary px-2.5 py-1 text-xs font-semibold text-primary">{skillPopup.name}</span>
              <button type="button" className="btn-ghost text-sm px-2" onClick={() => setSkillPopup(null)} aria-label="Close">×</button>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-foreground-muted whitespace-pre-wrap">{skillPopup.description?.trim() || "No description added for this skill yet."}</p>
            <p className="mt-3 text-[10px] text-foreground-subtle">Tap outside to close</p>
          </div>
        </div>
      )}
    </div>
  );
}
