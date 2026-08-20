"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OnchainFootprint as Footprint, OnchainToken } from "@/lib/onchain";

type Props = {
  address: string | null;
  ensName: string | null;
  arkhamUrl: string | null;
  owner?: boolean;
  profileId?: string | null;
  showDustTokens?: boolean;
};

function usdLabel(value: number | null) {
  if (value == null) return "";
  if (value < 0.01) return "<$0.01";
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function OnchainFootprint({
  address,
  ensName,
  arkhamUrl,
  owner = false,
  profileId = null,
  showDustTokens = false,
}: Props) {
  const [data, setData] = useState<Footprint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDust, setShowDust] = useState(showDustTokens);

  useEffect(() => {
    setShowDust(showDustTokens);
  }, [showDustTokens]);

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

  const visibleTokens = useMemo(() => {
    if (!data) return [] as OnchainToken[];
    return data.tokens.filter((t) => !t.isDust || showDust);
  }, [data, showDust]);

  async function toggleDust() {
    const next = !showDust;
    setShowDust(next);
    if (!owner || !profileId) return;
    const supabase = createClient();
    await supabase.from("profiles").update({ show_dust_tokens: next }).eq("id", profileId);
  }

  if (!address) {
    return (
      <div className="card p-3 sm:p-4 text-sm text-foreground-subtle">
        No wallet connected. Connect a wallet in Profile to aggregate this talent&apos;s onchain footprint.
      </div>
    );
  }

  const ens = data?.ens || ensName;
  const explorers = data?.explorers ?? [
    { label: "Etherscan", href: `https://etherscan.io/address/${address}` },
    ...(arkhamUrl ? [{ label: "Arkham", href: arkhamUrl }] : []),
  ];
  const dustCount = data?.tokens.filter((t) => t.isDust).length ?? 0;
  const valuedCount = data?.tokens.filter((t) => !t.isDust).length ?? 0;

  return (
    <div className="space-y-4">
      <p className="text-xs sm:text-sm text-foreground-muted leading-relaxed rounded-lg border border-border/60 bg-surface/40 px-3 py-2.5">
        Live aggregator across Ethereum, Base, Arbitrum, Optimism and Polygon. Counts real transactions and token
        transfers, lists holdings by contract, and flags popular DeFi protocols this wallet has touched.
      </p>

      <div className="card p-3 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground-subtle">Wallet</h3>
            {ens && <p className="mt-1 text-sm font-semibold">{ens}</p>}
            <p className="mt-0.5 font-mono text-xs text-foreground-muted break-all">{address}</p>
          </div>
          <button type="button" className="btn-ghost text-xs" onClick={() => navigator.clipboard.writeText(address)}>
            Copy
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {explorers.map((x) => (
            <a
              key={x.label}
              href={x.href}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-border bg-surface-elevated px-2.5 py-1 text-[11px] font-medium hover:border-primary/40 hover:text-primary"
            >
              {x.label}
            </a>
          ))}
        </div>
      </div>

      {loading && <div className="card p-3 text-sm text-foreground-muted">Reading onchain footprint…</div>}
      {error && <div className="card p-3 text-sm text-danger">{error}</div>}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="card p-3">
              <p className="text-[10px] uppercase tracking-wide text-foreground-subtle">Chains</p>
              <p className="mt-1 text-lg font-semibold">{data.activeChains}</p>
            </div>
            <div className="card p-3">
              <p className="text-[10px] uppercase tracking-wide text-foreground-subtle">Transactions</p>
              <p className="mt-1 text-lg font-semibold">{data.totalTx.toLocaleString()}</p>
            </div>
            <div className="card p-3">
              <p className="text-[10px] uppercase tracking-wide text-foreground-subtle">Transfers</p>
              <p className="mt-1 text-lg font-semibold">{data.totalTransfers.toLocaleString()}</p>
            </div>
            <div className="card p-3">
              <p className="text-[10px] uppercase tracking-wide text-foreground-subtle">Tokens</p>
              <p className="mt-1 text-lg font-semibold">{valuedCount}</p>
              {dustCount > 0 && <p className="text-[10px] text-foreground-subtle">{dustCount} dust</p>}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-foreground-subtle">
              DeFi protocols
            </h3>
            {data.protocols.length === 0 ? (
              <div className="card p-3 text-sm text-foreground-subtle">
                No popular DeFi routers detected in recent activity on the tracked chains.
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {data.protocols.map((p) => (
                  <a
                    key={`${p.chain}-${p.name}-${p.address}`}
                    href={p.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-border bg-surface-elevated px-2.5 py-1 text-[11px] font-medium hover:border-primary/40 hover:text-primary"
                  >
                    {p.name}
                    <span className="ml-1 text-foreground-subtle">{p.chain}</span>
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-foreground-subtle">
              Chain activity
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {data.chains.map((c) => (
                <a
                  key={c.id}
                  href={c.explorer}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card flex items-center justify-between gap-3 p-3 hover:border-primary/40"
                >
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-[11px] text-foreground-subtle">
                      {c.txCount.toLocaleString()} txs · {c.transferCount.toLocaleString()} transfers · {c.tokenCount}{" "}
                      tokens
                    </p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">{c.balance}</p>
                </a>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-[10px] font-semibold uppercase tracking-wide text-foreground-subtle">Tokens</h3>
              {owner && dustCount > 0 && (
                <button type="button" className="btn-ghost text-[11px]" onClick={toggleDust}>
                  {showDust ? "Hide dust under $1" : `Show dust (${dustCount})`}
                </button>
              )}
            </div>
            {visibleTokens.length === 0 ? (
              <div className="card text-sm text-foreground-subtle">
                {data.tokens.length
                  ? "Dust tokens under $1 are hidden. Anything worth $1 or more always shows."
                  : "No ERC-20 tokens found."}
              </div>
            ) : (
              <div className="card divide-y divide-border/70 overflow-hidden p-0">
                {visibleTokens.map((t) => (
                  <a
                    key={`${t.chain}-${t.contract}`}
                    href={t.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-surface-hover"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.symbol}</p>
                      <p className="text-[11px] text-foreground-subtle truncate">
                        {t.chain}
                        {t.name ? ` · ${t.name}` : ""}
                        {t.isDust ? " · dust" : ""}
                      </p>
                      <p className="font-mono text-[10px] text-foreground-subtle truncate">{t.contract}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs tabular-nums text-foreground-muted">{t.balance}</p>
                      {t.usdValue != null && <p className="text-[10px] text-foreground-subtle">{usdLabel(t.usdValue)}</p>}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
