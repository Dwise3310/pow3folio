"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

function pickMedia(json: ResolvePayload) {
  const animation = json.media?.animation;
  const primary =
    animation?.url && (animation.type === "video" || animation.type === "gif")
      ? animation
      : json.media?.primary;
  return {
    url: primary?.url || json.image || json.image_url || null,
    type: primary?.type || null,
    posterUrl: json.media?.posterUrl || null,
  };
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
  const persisted = useRef<string | null>(null);

  useEffect(() => {
    setSrc(item.image_url);
    setKind(null);
    setPosterUrl(null);
    persisted.current = null;
  }, [item.image_url, item.id]);

  function apply(url: string | null, type: NftMediaKind | null, poster: string | null) {
    if (!url) return false;
    setSrc(url);
    setKind(type);
    setPosterUrl(poster);
    if (url !== item.image_url && isTrustedMediaHost(url) && persisted.current !== url) {
      persisted.current = url;
      onResolved?.(url);
    }
    return true;
  }

  useEffect(() => {
    if (!contract || tokenId === "") return;
    if (item.image_url && isTrustedMediaHost(item.image_url)) {
      setSrc(item.image_url);
      return;
    }
    let cancelled = false;
    const qs = new URLSearchParams({
      contract,
      tokenId,
      chain: item.chain || "",
    });
    fetch(`/api/onchain/nft-art?${qs.toString()}`)
      .then((res) => res.json())
      .then((json: ResolvePayload) => {
        if (cancelled) return;
        const next = pickMedia(json);
        apply(next.url, next.type, next.posterUrl);
      })
      .catch(() => {
        /* keep stored url */
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract, tokenId, item.chain, item.id, item.image_url]);

  return (
    <div className={className}>
      <NFTMediaRenderer
        key={`${item.id}:${src || "none"}`}
        src={src}
        type={kind}
        posterUrl={posterUrl}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
