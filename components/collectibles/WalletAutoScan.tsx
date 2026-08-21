"use client";

import { useEffect, useState } from "react";

export default function WalletAutoScan({ lastScanAt }: { lastScanAt: string | null }) {
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const last = lastScanAt ? new Date(lastScanAt).getTime() : 0;
    const stale = !last || Date.now() - last > 24 * 60 * 60 * 1000;
    if (!stale) return;
    fetch("/api/cron/wallet-scan")
      .then((res) => res.json())
      .then((json: { imported?: number }) => {
        if (json.imported && json.imported > 0) {
          setNote(`Auto-scan added ${json.imported} new NFT${json.imported === 1 ? "" : "s"}.`);
        }
      })
      .catch(() => undefined);
  }, [lastScanAt]);

  if (!note) return null;
  return <p className="mb-4 text-sm text-foreground-muted">{note}</p>;
}
