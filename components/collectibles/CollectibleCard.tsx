"use client";

import { useMemo, useState } from "react";
import ShareButton from "@/components/writing/ShareButton";
import type { Collectible } from "@/types/database";

type Props = {
  item: Collectible;
  profileUrl: string;
};

function imageCandidates(raw: string | null): string[] {
  if (!raw) return [];
  const value = raw.trim();
  const urls = [value];
  const cid = value.match(/(Qm[1-9A-HJ-NP-Za-km-z]{44,}|bafy[a-z0-9]+)/i)?.[0];
  if (cid) {
    const rest = value.includes(cid) ? value.slice(value.indexOf(cid) + cid.length).replace(/^\/+/, "") : "";
    const path = rest ? `${cid}/${rest.split("?")[0]}` : cid;
    urls.push(`https://ipfs.io/ipfs/${path}`, `https://cloudflare-ipfs.com/ipfs/${path}`);
  }
  return [...new Set(urls)].map((u) => `/api/media?u=${encodeURIComponent(u)}`);
}

export default function CollectibleCard({ item, profileUrl }: Props) {
  const shareUrl = item.url || profileUrl;
  const meta = [item.chain, item.collection_name, item.token_id].filter(Boolean).join(" · ");
  const candidates = useMemo(() => imageCandidates(item.image_url), [item.image_url]);
  const [idx, setIdx] = useState(0);
  const src = candidates[idx];

  const CardInner = (
    <>
      <div className="aspect-square w-full overflow-hidden rounded-lg bg-surface-elevated">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
            onError={() => setIdx((n) => n + 1)}
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
