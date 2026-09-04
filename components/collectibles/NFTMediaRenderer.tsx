"use client";

import { useMemo, useState } from "react";
import { isTrustedMediaHost, mediaProxySrc, type NftMediaKind } from "@/lib/nft-media";

type Props = {
  src: string | null;
  type?: NftMediaKind | null;
  posterUrl?: string | null;
  alt?: string;
  className?: string;
  onExhausted?: () => void;
};

export default function NFTMediaRenderer({ src, type, posterUrl, alt = "", className, onExhausted }: Props) {
  const trusted = isTrustedMediaHost(src);
  const [useProxy, setUseProxy] = useState(!trusted);
  const [broken, setBroken] = useState(false);

  const displaySrc = useMemo(() => {
    if (!src || broken) return "";
    return useProxy ? mediaProxySrc(src) : src;
  }, [src, useProxy, broken]);

  function handleError() {
    if (useProxy && src) {
      setUseProxy(false);
      return;
    }
    setBroken(true);
    onExhausted?.();
  }

  if (!src || broken || !displaySrc) {
    return (
      <div className="flex h-full items-center justify-center text-xs uppercase text-foreground-subtle">NFT</div>
    );
  }

  const kind = type || "image";

  if (kind === "video") {
    return (
      <video
        src={displaySrc}
        poster={posterUrl || undefined}
        autoPlay
        loop
        muted
        playsInline
        controls={false}
        className={className || "h-full w-full object-cover"}
        onError={handleError}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={displaySrc}
      alt={alt}
      referrerPolicy="no-referrer"
      className={className || "h-full w-full object-cover"}
      onError={handleError}
    />
  );
}
