"use client";

import { useState } from "react";
import ShareButton from "@/components/writing/ShareButton";
import TradeCard from "@/components/trading/TradeCard";
import CommunityCard from "@/components/community/CommunityCard";
import AirdropCard from "@/components/airdrops/AirdropCard";
import CollectibleCard from "@/components/collectibles/CollectibleCard";
import PlatformLogo from "@/components/ui/PlatformLogo";
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

type TabId =
  | "about"
  | "writing"
  | "trading"
  | "community"
  | "airdrops"
  | "onchain";

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
    { id: "writing", label: "Technical Writing / Research", show: showWriting },
    { id: "trading", label: "Trading Record", show: showTrading },
    { id: "community", label: "Community", show: showCommunity },
    { id: "airdrops", label: "Airdrops", show: showAirdrops },
    { id: "onchain", label: "Onchain Stats", show: showOnchain },
  ];
  const tabs = allTabs.filter((t) => t.show);

  const [active, setActive] = useState<TabId>("about");
  const [animKey, setAnimKey] = useState(0);

  function selectTab(id: TabId) {
    if (id === active) return;
    setActive(id);
    setAnimKey((k) => k + 1);
  }

  return (
    <div className="mt-5 sm:mt-6">
      <div className="sticky top-0 z-20 -mx-1 border-b border-border/80 bg-background/95 backdrop-blur-sm">
        <div
          className="flex gap-0 overflow-x-auto scrollbar-none px-1"
          style={{ WebkitOverflowScrolling: "touch" }}
          role="tablist"
        >
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
                  isActive
                    ? "text-foreground"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                {t.label}
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div key={animKey} className="tab-panel-enter pt-4 pb-8">
        {active === "about" && (
          <div className="space-y-5">
            {skills.length > 0 && (
              <div>
                <h3 className="mb-2.5 text-xs font-medium uppercase tracking-wide text-foreground-subtle">
                  Skills / Service pillars
                </h3>
                <div className="space-y-3">
                  {skills.map((skill) => (
                    <div key={skill.name} className="space-y-1">
                      <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                        {skill.name}
                      </span>
                      {skill.description ? (
                        <p className="text-xs leading-relaxed text-foreground-muted pl-0.5">
                          {skill.description}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {longBio && (
              <div className="card p-3 sm:p-4">
                <h3 className="text-xs font-medium uppercase tracking-wide text-foreground-subtle">
                  About
                </h3>
                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed break-words">
                  {longBio}
                </p>
              </div>
            )}

            {workExperience.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground-subtle">
                  Work experience
                </h3>
                <div className="space-y-2">
                  {workExperience.map((w) => (
                    <div key={w.id} className="card p-3">
                      <div className="min-w-0">
                        {w.url ? (
                          <a
                            href={w.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-sm text-primary hover:underline"
                          >
                            {w.company}
                          </a>
                        ) : (
                          <p className="font-medium text-sm">{w.company}</p>
                        )}
                        <p className="text-xs text-foreground-muted">
                          {w.role} ·{" "}
                          {w.employment_type === "full-time" ? "Full-time" : "Part-time"}
                        </p>
                        <p className="text-xs text-foreground-subtle mt-0.5">
                          {w.start_date}
                          {w.end_date ? ` → ${w.end_date}` : " → Present"}
                        </p>
                        {w.description && (
                          <p className="mt-1 text-xs text-foreground-muted">{w.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {education.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground-subtle">
                  Education
                </h3>
                <div className="space-y-2">
                  {education.map((e) => (
                    <div key={e.id} className="card p-3">
                      {e.url ? (
                        <a
                          href={e.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-sm text-primary hover:underline"
                        >
                          {e.institution}
                        </a>
                      ) : (
                        <p className="font-medium text-sm">{e.institution}</p>
                      )}
                      <p className="text-xs text-foreground-muted">
                        {[e.degree, e.field_of_study].filter(Boolean).join(" · ")}
                      </p>
                      <p className="text-xs text-foreground-subtle mt-0.5">
                        {[
                          e.country,
                          e.start_year && e.end_year
                            ? `${e.start_year} – ${e.end_year}`
                            : e.start_year || e.end_year,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {e.description && (
                        <p className="mt-1 text-xs text-foreground-muted">{e.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {credentials.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground-subtle">
                  Docs & credentials
                </h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {credentials.map((doc) => (
                    <a
                      key={doc.id}
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="card flex items-center gap-3 p-3 transition-all hover:border-primary/40"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-elevated text-[10px] font-medium uppercase text-foreground-subtle">
                        {(doc.file_type || "").includes("pdf")
                          ? "PDF"
                          : (doc.file_name || "DOC").split(".").pop()?.slice(0, 4) ||
                            "DOC"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium break-words">{doc.title}</p>
                        <p className="text-xs text-foreground-muted">
                          {[doc.issuer, doc.file_name].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {skills.length === 0 &&
              !longBio &&
              workExperience.length === 0 &&
              education.length === 0 &&
              credentials.length === 0 && (
                <div className="card text-sm text-foreground-subtle">No about details yet.</div>
              )}
          </div>
        )}

        {active === "writing" && (
          <div>
            {writings.length === 0 ? (
              <div className="card text-sm text-foreground-subtle">
                No technical writing or research yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {writings.map((w) => (
                  <article
                    key={w.id}
                    className="card flex flex-col overflow-hidden p-0 transition-all duration-200 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-md"
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
                    <div className="flex flex-1 flex-col p-2.5 sm:p-3">
                      <a
                        href={w.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary hover:underline line-clamp-2 text-xs sm:text-sm"
                      >
                        {w.title}
                      </a>
                      {w.description && (
                        <p className="mt-1 text-[11px] sm:text-xs text-foreground-muted line-clamp-2">
                          {w.description}
                        </p>
                      )}
                      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                        <div className="flex min-w-0 flex-wrap gap-1 text-[10px] text-foreground-subtle">
                          {w.published_at && <span>{w.published_at}</span>}
                        </div>
                        <ShareButton title={w.title} url={w.url} />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {active === "trading" && (
          <div className="space-y-4">
            {tradingPlatforms.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tradingPlatforms.map((p) => (
                  <a
                    key={p.id}
                    href={p.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-elevated pl-1 pr-2.5 py-1 text-xs font-medium transition-all hover:border-primary/40 hover:text-primary"
                  >
                    <PlatformLogo name={p.name} size={18} className="h-[18px] w-[18px]" />
                    {p.name}
                  </a>
                ))}
              </div>
            )}

            {trades.length === 0 ? (
              <div className="card text-sm text-foreground-subtle">No trades yet.</div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {trades.map((t) => (
                  <TradeCard
                    key={t.id}
                    trade={t}
                    updates={updatesByTrade[t.id] ?? []}
                    profileUrl={profileUrl}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {active === "community" && (
          <div>
            {community.length === 0 ? (
              <div className="card text-sm text-foreground-subtle">
                No community contributions yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {community.map((c) => (
                  <CommunityCard key={c.id} item={c} profileUrl={profileUrl} />
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {airdrops.map((a) => (
                  <AirdropCard key={a.id} item={a} profileUrl={profileUrl} />
                ))}
              </div>
            )}
          </div>
        )}

        {active === "onchain" && (
          <div className="space-y-4">
            <div className="card p-3 sm:p-4 space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-foreground-subtle">
                Wallet
              </h3>
              {walletAddress || ensName ? (
                <div className="space-y-1.5 text-sm">
                  {ensName && <p className="font-medium">{ensName}</p>}
                  {walletAddress && arkhamUrl && (
                    <a
                      href={arkhamUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block font-mono text-xs text-primary hover:underline break-all"
                    >
                      {walletAddress}
                    </a>
                  )}
                  {walletAddress && arkhamUrl && (
                    <a
                      href={arkhamUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex text-xs text-foreground-muted hover:text-primary"
                    >
                      View on Arkham →
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-sm text-foreground-subtle">No wallet connected.</p>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground-subtle">
                NFTs
              </h3>
              {nfts.length === 0 ? (
                <div className="card text-sm text-foreground-subtle">No NFTs yet.</div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {nfts.map((c) => (
                    <CollectibleCard key={c.id} item={c} profileUrl={profileUrl} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
