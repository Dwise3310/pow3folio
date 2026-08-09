"use client";

import { useState } from "react";

type Props = {
  title: string;
  url: string;
};

export default function ShareButton({ title, url }: Props) {
  const [copied, setCopied] = useState(false);

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // user cancelled or share failed; fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <button type="button" onClick={share} className="btn-ghost text-xs shrink-0">
      {copied ? "Copied" : "Share"}
    </button>
  );
}
