"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OnchainChain, OnchainFootprint as Footprint, OnchainToken } from "@/lib/onchain";

type Props = {
  address: string | null;
  ensName: string | null;
  arkhamUrl: string | null;
  owner?: boolean;
  profileId?: string | null;
  showDustTokens?: boolean;
};

const HEADING =
  "section-heading mb-2 text-sm font-extrabold tracking-wide text-amber-700/90 dark:text-amber-400/75";

function usd(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value > 0 && value < 0.01) return "<$0.01";
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <p className="text-[10px] uppercase tracking-wide text-foreground-subtle">{label}</p>
      <p className="mt-1 text-base font-semibold tabular-nums leading-none">{value}</p>
    </div>
  );
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
  const [chainId, setChainId] = useState<string>("all");

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
        if (cancelled) return;
        setData(json);
        const preferred = json.chains.find((c) => c.hasHoldings) || json.chains.find((c) => c.interacted);
        if (preferred) setChainId(preferred.id);
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

  const interacted = useMemo(() => data?.chains.filter((c) => c.interacted) ?? [], [data]);
  const selected: OnchainChain | null = useMemo(() => {
    if (!data || chainId === "all") return null;
    return data.chains.find((c) => c.id === chainId) || null;
  }, [data, chainId]);

  const visibleTokens = useMemo(() => {
    if (!data) return [] as OnchainToken[];
    return data.tokens.filter((t) => {
      if (selected && t.chainId !== selected.id) return false;
      return !t.isDust || showDust;
    });
  }, [data, selected, showDust]);

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
  const dustCount = (data?.tokens || []).filter((t) => t.isDust && (!selected || t.chainId === selected.id)).length;
  const portfolioValue = selected
    ? (selected.nativeUsd && selected.nativeUsd >= 0.01 ? selected.nativeUsd : 0) +
      (data?.tokens || [])
        .filter((t) => t.chainId === selected.id && t.usdValue && !t.isDust)
        .reduce((sum, t) => sum + (t.usdValue || 0), 0)
    : data?.totalValueUsd || 0;

  const metrics = selected
    ? [
        { label: "Interactions", value: selected.txCount.toLocaleString() },
        { label: "Volume", value: usd(selected.volumeUsd) },
        { label: "Contracts", value: selected.uniqueContracts.toLocaleString() },
        { label: "Fees", value: usd(selected.feesUsd) },
        { label: "Unique tokens", value: selected.uniqueTokens.toLocaleString() },
        { label: "Token trades", value: selected.tokenTrades.toLocaleString() },
        { label: "NFT mints", value: selected.nftMints.toLocaleString() },
        { label: "Wallet age", value: selected.walletAgeDays ? `${selected.walletAgeDays}d` : "—" },
        { label: "Active days", value: selected.activeDays.toLocaleString() },
        { label: "Active weeks", value: selected.activeWeeks.toLocaleString() },
        { label: "Active months", value: selected.activeMonths.toLocaleString() },
        { label: "Transfers", value: selected.transferCount.toLocaleString() },
      ]
    : [
        { label: "Interactions", value: (data?.totalTx || 0).toLocaleString() },
        { label: "Volume", value: usd(data?.totalVolumeUsd) },
        { label: "Fees", value: usd(data?.totalFeesUsd) },
        { label: "Transfers", value: (data?.totalTransfers || 0).toLocaleString() },
        { label: "Chains used", value: (data?.activeChains || 0).toString() },
        { label: "Holding chains", value: (data?.holdingChains || 0).toString() },
      ];

  return (
    <div className="space-y-4">
      <div className="card p-3 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className={HEADING}>Wallet</h3>
            {ens && <p className="text-sm font-semibold">{ens}</p>}
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
          <div>
            <h3 className={HEADING}>Chain</h3>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setChainId("all")} className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${chainId === "all" ? "border-primary text-primary bg-primary/10" : "border-border bg-surface-elevated"}`}>
                All
              </button>
              {interacted.map((c) => (
                <button key={c.id} type="button" onClick={() => setChainId(c.id)} className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${chainId === c.id ? "border-primary text-primary bg-primary/10" : "border-border bg-surface-elevated"}`}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Metric label="Value" value={usd(portfolioValue)} />
            <Metric label="Chains" value={(selected ? 1 : data.holdingChains).toString()} />
            <Metric label="Tokens" value={visibleTokens.filter((t) => !t.isDust).length.toString()} />
          </div>

          <div>
            <h3 className={HEADING}>{selected ? `${selected.name} stats` : "Portfolio stats"}</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {metrics.map((m) => (
                <Metric key={m.label} label={m.label} value={m.value} />
              ))}
            </div>
          </div>

          {data.protocols.length > 0 && (
            <div>
              <h3 className={HEADING}>DeFi protocols</h3>
              <div className="flex flex-wrap gap-1.5">
                {data.protocols.filter((p) => !selected || p.chain === selected.name).map((p) => (
                  <a key={`${p.chain}-${p.name}-${p.address}`} href={p.href} target="_blank" rel="noopener noreferrer" className="rounded-full border border-border bg-surface-elevated px-2.5 py-1 text-[11px] font-medium hover:border-primary/40 hover:text-primary">
                    {p.name}
                    <span className="ml-1 text-foreground-subtle">{p.chain}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className={`${HEADING} mb-0`}>Tokens</h3>
              {owner && dustCount > 0 && (
                <button type="button" className="btn-ghost text-[11px]" onClick={toggleDust}>
                  {showDust ? "Hide dust under $1" : `Show dust (${dustCount})`}
                </button>
              )}
            </div>
            {visibleTokens.length === 0 && !(selected && selected.nativeUsd != null && selected.nativeUsd >= 0.01) ? (
              <div className="card text-sm text-foreground-subtle">
                {data.tokens.length ? "Dust tokens under $1 are hidden. Anything worth $1 or more always shows." : "No ERC-20 tokens found on this view."}
              </div>
            ) : (
              <div className="card divide-y divide-border/70 overflow-hidden p-0">
                {selected && selected.nativeUsd != null && selected.nativeUsd >= 0.01 && (
                  <div className="flex items-center justify-between gap-3 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{selected.nativeSymbol}</p>
                      <p className="text-[11px] text-foreground-subtle">{selected.name} · native</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs tabular-nums text-foreground-muted">{selected.balance}</p>
                      <p className="text-[10px] text-foreground-subtle">{usd(selected.nativeUsd)}</p>
                    </div>
                  </div>
                )}
                {visibleTokens.map((t) => (
                  <a key={`${t.chain}-${t.contract}`} href={t.href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-surface-hover">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.symbol}</p>
                      <p className="text-[11px] text-foreground-subtle truncate">
                        {t.chain}{t.name ? ` · ${t.name}` : ""}{t.isDust ? " · dust" : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs tabular-nums text-foreground-muted">{t.balance}</p>
                      {t.usdValue != null && <p className="text-[10px] text-foreground-subtle">{usd(t.usdValue)}</p>}
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
