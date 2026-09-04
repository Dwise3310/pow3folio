"use client";

import { useEffect, useMemo, useState } from "react";
import type { Collectible } from "@/types/database";
import { isTrustedMediaHost, type NftMediaKind } from "@/lib/nft-media";
import NFTMediaRenderer from "@/components/collectibles/NFTMediaRenderer";

type ResolvePayload = {
  image?: string | null;
  image_url?: string | null;
  media?: {
    primary?: { type?: NftMediaKind; url?: string } | null;
    animation?: { type?: NftMediaKind; url?: string } | null;
    posterUrl?: string | null;
  };
};

function contractFrom(item: Collectible) {
  const tagged = (item.tags || []).find((t) => t.startsWith("ca:"))?.slice(3) || "";
  if (tagged) return tagged;
  const fromUrl = (item.url || "").match(/0x[a-fA-F0-9]{40}/);
  return fromUrl ? fromUrl[0].toLowerCase() : "";
}

export default function CollectibleThumb({
  item,
  className = "h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-elevated",
  onResolved,
}: {
  item: Collectible;
  className?: string;
  onResolved?: (url: string) => void;
}) {
  const contract = useMemo(() => contractFrom(item), [item.tags, item.url]);
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
    if (next !== item.image_url && isTrustedMediaHost(next)) onResolved?.(next);
    return true;
  }

  function handleExhausted() {
    if (lookedUp || !contract || tokenId === "") return;
    setLookedUp(true);
    const qs = new URLSearchParams({
      contract,
      tokenId,
      chain: item.chain || "",
    });
    fetch(`/api/onchain/nft-art?${qs.toString()}`)
      .then((res) => res.json())
      .then((json: ResolvePayload) => {
        applyResolved(json);
      })
      .catch(() => undefined);
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

  return (
    <div className={className}>
      <NFTMediaRenderer src={src} type={kind} posterUrl={posterUrl} className="h-full w-full object-cover" onExhausted={handleExhausted} />
    </div>
  );
}
