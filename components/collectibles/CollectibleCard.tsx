"use client";

import { useEffect, useMemo, useState } from "react";
import ShareButton from "@/components/writing/ShareButton";
import type { Collectible } from "@/types/database";
import { isTrustedMediaHost, type NftMediaKind } from "@/lib/nft-media";
import NFTMediaRenderer from "@/components/collectibles/NFTMediaRenderer";

type Props = {
  item: Collectible;
  profileUrl: string;
};

type ResolvePayload = {
  image?: string | null;
  image_url?: string | null;
  media?: {
    primary?: { type?: NftMediaKind; url?: string } | null;
    animation?: { type?: NftMediaKind; url?: string } | null;
    posterUrl?: string | null;
  };
};

export default function CollectibleCard({ item, profileUrl }: Props) {
  const shareUrl = item.url || profileUrl;
  const meta = [item.chain, item.collection_name, item.token_id].filter((v) => v != null && String(v) !== "").join(" · ");
  const contract = useMemo(() => {
    const tagged = (item.tags || []).find((t) => t.startsWith("ca:"))?.slice(3) || "";
    if (tagged) return tagged;
    const fromUrl = (item.url || "").match(/0x[a-fA-F0-9]{40}/);
    return fromUrl ? fromUrl[0].toLowerCase() : "";
  }, [item.tags, item.url]);

  const tokenId = item.token_id == null ? "" : String(item.token_id);
  const [src, setSrc] = useState<string | null>(item.image_url);
  const [kind, setKind] = useState<NftMediaKind | null>(null);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [lookedUp, setLookedUp] = useState(false);

  useEffect(() => {
    setSrc(item.image_url);
    setKind(null);
    setPosterUrl(null);
    setLookedUp(false);
  }, [item.image_url, item.id]);

  function applyResolved(json: ResolvePayload) {
    const primary =
      json.media?.animation?.url && (json.media.animation.type === "video" || json.media.animation.type === "gif")
        ? json.media.animation
        : json.media?.primary;
    const next = primary?.url || json.image || json.image_url || null;
    if (!next) return false;
    setSrc(next);
    setKind(primary?.type || null);
    setPosterUrl(json.media?.posterUrl || null);
    return true;
  }

  function handleExhausted() {
    if (lookedUp || !contract || tokenId === "") {
      setSrc(null);
      return;
    }
    setLookedUp(true);
    const qs = new URLSearchParams({
      contract,
      tokenId,
      chain: item.chain || "",
    });
    fetch(`/api/onchain/nft-art?${qs.toString()}`)
      .then((res) => res.json())
      .then((json: ResolvePayload) => {
        if (!applyResolved(json)) setSrc(null);
      })
      .catch(() => setSrc(null));
  }

  useEffect(() => {
    if (lookedUp || !contract || tokenId === "") return;
    if (src && isTrustedMediaHost(src)) return;
    if (src && !src.includes("ipfs") && !src.includes("w3s.link")) return;
    let cancelled = false;
    const qs = new URLSearchParams({ contract, tokenId, chain: item.chain || "" });
    fetch(`/api/onchain/nft-art?${qs.toString()}`)
      .then((res) => res.json())
      .then((json: ResolvePayload) => {
        if (cancelled) return;
        applyResolved(json);
        setLookedUp(true);
      })
      .catch(() => {
        if (!cancelled) setLookedUp(true);
      });
    return () => {
      cancelled = true;
    };
  }, [src, contract, tokenId, item.chain, lookedUp]);

  const CardInner = (
    <>
      <div className="aspect-square w-full overflow-hidden rounded-lg bg-surface-elevated">
        <NFTMediaRenderer src={src} type={kind} posterUrl={posterUrl} onExhausted={handleExhausted} />
      </div>
      <div className="mt-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-medium leading-snug break-words">{item.title}</h3>
          {meta && <p className="mt-0.5 text-[11px] text-foreground-muted">{meta}</p>}
        </div>
        <ShareButton title={item.title} url={shareUrl} />
      </div>
    </>
  );

  if (item.url) {
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="card flex flex-col p-3 transition-all duration-200 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-md"
      >
        {CardInner}
      </a>
    );
  }

  return <article className="card flex flex-col p-3">{CardInner}</article>;
}
