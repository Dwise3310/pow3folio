"use client";

import { useEffect, useState } from "react";
import type { OnchainFootprint as Footprint } from "@/lib/onchain";

type Props = {
  address: string | null;
  ensName: string | null;
  arkhamUrl: string | null;
};

export default function OnchainFootprint({ address, ensName, arkhamUrl }: Props) {
  const [data, setData] = useState<Footprint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/onchain/${address}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load onchain data");
        return (await res.json()) as Footprint;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Lookup failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  if (!address) {
    return (
      <div className="card p-3 sm:p-4 text-sm text-foreground-subtle">
        No wallet connected. Connect a wallet in Profile to aggregate this talent's onchain footprint.
      </div>
    );
  }

  const ens = data?.ens || ensName;
  const explorers = data?.explorers ?? [
    { label: "Etherscan", href: `https://etherscan.io/address/${address}` },
    ...(arkhamUrl ? [{ label: "Arkham", href: arkhamUrl }] : []),
  ];

  return (
    <div className="space-y-4">
      <p className="text-xs sm:text-sm text-foreground-muted leading-relaxed rounded-lg border border-border/60 bg-surface/40 px-3 py-2.5">
        Live aggregator of this wallet across Ethereum, Base, Arbitrum, Optimism and Polygon: balances, transaction count, tokens, plus explorer links.
      </p>
      <div className="card p-3 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-xs font-medium uppercase tracking-wide text-foreground-subtle">Wallet</h3>
            {ens && <p className="mt-1 text-sm font-semibold">{ens}</p>}
            <p className="mt-0.5 font-mono text-xs text-foreground-muted break-all">{address}</p>
          </div>
          <button type="button" className="btn-ghost text-xs" onClick={() => navigator.clipboard.writeText(address)}>
            Copy
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {explorers.map((x) => (
            <a key={x.label} href={x.href} target="_blank" rel="noopener noreferrer" className="rounded-full border border-border bg-surface-elevated px-2.5 py-1 text-[11px] font-medium hover:border-primary/40 hover:text-primary">
              {x.label}
            </a>
          ))}
        </div>
      </div>
      {loading && <div className="card p-3 text-sm text-foreground-muted">Reading onchain footprint…</div>}
      {error && <div className="card p-3 text-sm text-danger">{error}</div>}
      {data && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="card p-3">
              <p className="text-[10px] uppercase tracking-wide text-foreground-subtle">Chains</p>
              <p className="mt-1 text-lg font-semibold">{data.activeChains}</p>
            </div>
            <div className="card p-3">
              <p className="text-[10px] uppercase tracking-wide text-foreground-subtle">Transactions</p>
              <p className="mt-1 text-lg font-semibold">{data.totalTx}</p>
            </div>
            <div className="card p-3">
              <p className="text-[10px] uppercase tracking-wide text-foreground-subtle">Tokens</p>
              <p className="mt-1 text-lg font-semibold">{data.tokens.length}</p>
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-[10px] font-medium uppercase tracking-wide text-foreground-subtle">Chain activity</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {data.chains.map((c) => (
                <a key={c.id} href={c.explorer} target="_blank" rel="noopener noreferrer" className="card flex items-center justify-between gap-3 p-3 hover:border-primary/40">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-[11px] text-foreground-subtle">{c.txCount} txs · {c.tokenCount} tokens</p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">{c.balance}</p>
                </a>
              ))}
            </div>
          </div>
          {data.tokens.length > 0 && (
            <div>
              <h3 className="mb-2 text-[10px] font-medium uppercase tracking-wide text-foreground-subtle">Tokens</h3>
              <div className="card divide-y divide-border/70 overflow-hidden p-0">
                {data.tokens.map((t, i) => (
                  <div key={`${t.chain}-${t.symbol}-${i}`} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.symbol}</p>
                      <p className="text-[11px] text-foreground-subtle truncate">{t.chain}{t.name ? ` · ${t.name}` : ""}</p>
                    </div>
                    <p className="text-xs tabular-nums text-foreground-muted">{t.balance}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
