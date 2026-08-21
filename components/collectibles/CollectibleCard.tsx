"use client";

import { useState } from "react";
import ShareButton from "@/components/writing/ShareButton";
import type { Collectible } from "@/types/database";

type Props = {
  item: Collectible;
  profileUrl: string;
};

export default function CollectibleCard({ item, profileUrl }: Props) {
  const shareUrl = item.url || profileUrl;
  const meta = [item.chain, item.collection_name, item.token_id].filter(Boolean).join(" · ");
  const [broken, setBroken] = useState(false);
  const showImage = item.image_url && !broken;

  const CardInner = (
    <>
      <div className="aspect-square w-full overflow-hidden rounded-lg bg-surface-elevated">
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url || ""}
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
          {item.description && (
            <p className="mt-1 text-xs text-foreground-muted line-clamp-2">{item.description}</p>
          )}
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
