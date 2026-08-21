"use client";

import { useEffect, useMemo, useState } from "react";
import ShareButton from "@/components/writing/ShareButton";
import type { Collectible } from "@/types/database";
import { gatewayUrls, mediaProxySrc } from "@/lib/nft-media";

type Props = {
  item: Collectible;
  profileUrl: string;
};

export default function CollectibleCard({ item, profileUrl }: Props) {
  const shareUrl = item.url || profileUrl;
  const meta = [item.chain, item.collection_name, item.token_id].filter(Boolean).join(" · ");
  const contract = useMemo(() => {
    const tagged = (item.tags || []).find((t) => t.startsWith("ca:"))?.slice(3) || "";
    if (tagged) return tagged;
    const fromUrl = (item.url || "").match(/0x[a-fA-F0-9]{40}/);
    return fromUrl ? fromUrl[0].toLowerCase() : "";
  }, [item.tags, item.url]);

  const tokenId = item.token_id == null ? "" : String(item.token_id);
  const candidates = useMemo(() => gatewayUrls(item.image_url), [item.image_url]);
  const [idx, setIdx] = useState(0);
  const [src, setSrc] = useState<string | null>(candidates[0] || item.image_url);
  const [useProxy, setUseProxy] = useState(true);
  const [broken, setBroken] = useState(false);
  const [lookedUp, setLookedUp] = useState(false);

  useEffect(() => {
    const next = gatewayUrls(item.image_url);
    setIdx(0);
    setSrc(next[0] || item.image_url);
    setUseProxy(true);
    setBroken(false);
    setLookedUp(false);
  }, [item.image_url]);

  useEffect(() => {
    if (lookedUp || !contract || tokenId === "") return;
    if (src && !broken) return;
    let cancelled = false;
    const qs = new URLSearchParams({
      contract,
      tokenId,
      chain: item.chain || "",
    });
    fetch(`/api/onchain/nft-art?${qs.toString()}`)
      .then((res) => res.json())
      .then((json: { image_url?: string | null }) => {
        if (cancelled) return;
        if (!json.image_url) {
          setLookedUp(true);
          return;
        }
        const urls = gatewayUrls(json.image_url);
        setSrc(urls[0] || json.image_url);
        setUseProxy(true);
        setBroken(false);
        setLookedUp(true);
      })
      .catch(() => setLookedUp(true));
    return () => {
      cancelled = true;
    };
  }, [src, broken, contract, tokenId, item.chain, lookedUp]);

  function handleError() {
    if (useProxy && src) {
      setUseProxy(false);
      return;
    }
    const next = candidates[idx + 1];
    if (next) {
      setIdx((n) => n + 1);
      setSrc(next);
      setUseProxy(true);
      return;
    }
    if (contract && tokenId !== "" && !lookedUp) {
      setSrc(null);
      setBroken(true);
      return;
    }
    setBroken(true);
  }

  const showImage = src && !broken;
  const imgSrc = src ? (useProxy ? mediaProxySrc(src) : src) : "";

  const CardInner = (
    <>
      <div className="aspect-square w-full overflow-hidden rounded-lg bg-surface-elevated">
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt=""
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
            onError={handleError}
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
