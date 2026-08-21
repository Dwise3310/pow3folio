"use client";

import { useEffect, useMemo, useState } from "react";
import ShareButton from "@/components/writing/ShareButton";
import type { Collectible } from "@/types/database";

type Props = {
  item: Collectible;
  profileUrl: string;
};

function mediaSrc(url: string) {
  if (url.startsWith("/")) return url;
  return `/api/media?u=${encodeURIComponent(url)}`;
}

export default function CollectibleCard({ item, profileUrl }: Props) {
  const shareUrl = item.url || profileUrl;
  const meta = [item.chain, item.collection_name, item.token_id].filter(Boolean).join(" · ");
  const contract = useMemo(() => {
    const tagged = (item.tags || []).find((t) => t.startsWith("ca:"))?.slice(3) || "";
    if (tagged) return tagged;
    const fromUrl = (item.url || "").match(/0x[a-fA-F0-9]{40}/);
    return fromUrl ? fromUrl[0].toLowerCase() : "";
  }, [item.tags, item.url]);
  const [src, setSrc] = useState(item.image_url);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setSrc(item.image_url);
    setBroken(false);
  }, [item.image_url]);

  useEffect(() => {
    if (src || !contract || !item.token_id) return;
    let cancelled = false;
    const qs = new URLSearchParams({
      contract,
      tokenId: item.token_id,
      chain: item.chain || "",
    });
    fetch(`/api/onchain/nft-art?${qs.toString()}`)
      .then((res) => res.json())
      .then((json: { image_url?: string | null }) => {
        if (!cancelled && json.image_url) setSrc(json.image_url);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [src, contract, item.token_id, item.chain]);

  const showImage = src && !broken;

  const CardInner = (
    <>
      <div className="aspect-square w-full overflow-hidden rounded-lg bg-surface-elevated">
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaSrc(src)}
            alt=""
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
            onError={() => setBroken(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs uppercase text-foreground-subtle">
            NFT
          </div>
        )}
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
