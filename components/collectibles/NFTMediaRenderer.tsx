"use client";

import { useEffect, useMemo, useState } from "react";
import { isTrustedMediaHost, mediaProxySrc, type NftMediaKind } from "@/lib/nft-media";

type Props = {
  src: string | null;
  type?: NftMediaKind | null;
  posterUrl?: string | null;
  alt?: string;
  className?: string;
  onExhausted?: () => void;
};

export default function NFTMediaRenderer({
  src,
  type,
  posterUrl,
  alt = "",
  className,
  onExhausted,
}: Props) {
  const trusted = isTrustedMediaHost(src);
  const [useProxy, setUseProxy] = useState(!trusted);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setUseProxy(!isTrustedMediaHost(src));
    setBroken(false);
  }, [src]);

  const displaySrc = useMemo(() => {
    if (!src || broken) return "";
    if (trusted) return src;
    return useProxy ? mediaProxySrc(src) : src;
  }, [src, useProxy, broken, trusted]);

  function handleError() {
    if (useProxy && src && !trusted) {
      setUseProxy(false);
      return;
    }
    setBroken(true);
    onExhausted?.();
  }

  if (!src || broken || !displaySrc) {
    return (
      <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-wide text-foreground-subtle">
        NFT
      </div>
    );
  }

  const kind = type || "image";

  if (kind === "video") {
    return (
      <video
        key={displaySrc}
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
      key={displaySrc}
      src={displaySrc}
      alt={alt}
      referrerPolicy="no-referrer"
      className={className || "h-full w-full object-cover"}
      onError={handleError}
    />
  );
}
