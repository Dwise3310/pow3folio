"use client";

import ShareButton from "@/components/writing/ShareButton";
import type { Collectible } from "@/types/database";
import CollectibleThumb from "@/components/collectibles/CollectibleThumb";

type Props = {
  item: Collectible;
  profileUrl: string;
};

export default function CollectibleCard({ item, profileUrl }: Props) {
  const shareUrl = item.url || profileUrl;
  const meta = [item.chain, item.collection_name, item.token_id].filter((v) => v != null && String(v) !== "").join(" · ");

  const CardInner = (
    <>
      <CollectibleThumb item={item} className="aspect-square w-full overflow-hidden rounded-lg bg-surface-elevated" />
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
