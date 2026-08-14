"use client";

import { useState } from "react";
import { getPlatformLogo, getPlatformLogoFallback } from "@/lib/cex-dex-list";

type Props = {
  name: string;
  size?: number;
  className?: string;
};

export default function PlatformLogo({ name, size = 18, className = "" }: Props) {
  const [src, setSrc] = useState(() => getPlatformLogo(name));
  const [failed, setFailed] = useState(false);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={`rounded-full object-contain bg-white ${className}`}
      style={{ width: size, height: size }}
      onError={() => {
        if (failed) return;
        setFailed(true);
        setSrc(getPlatformLogoFallback(name));
      }}
    />
  );
}
