"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CustomChainInput, OnchainChain, OnchainFootprint as Footprint, OnchainToken } from "@/lib/onchain";
import ActivityHeatmap from "@/components/profile/ActivityHeatmap";

export type NamedWallet = {
  address: string;
  label: string;
};

type Props = {
  address: string | null;
  ensName: string | null;
  arkhamUrl: string | null;
  owner?: boolean;
  profileId?: string | null;
  showDustTokens?: boolean;
  wallets?: NamedWallet[];
  customChains?: CustomChainInput[];
};

const HEADING = "section-heading";

function usd(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || value <= 0) return "—";
  if (value < 0.01) return "<$0.01";
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function timeAgo(iso: string | null) {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "—";
  const delta = Date.now() - then;
  const mins = Math.floor(delta / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 45) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex h-[72px] flex-col justify-between rounded-xl border border-border bg-surface p-3">
      <p className="text-[10px] uppercase tracking-wide text-foreground-subtle">{label}</p>
      <p className="text-base font-semibold tabular-nums leading-none">{value}</p>
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
  wallets = [],
  customChains = [],
}: Props) {
  const [activeWallet, setActiveWallet] = useState(address || "");
  const [data, setData] = useState<Footprint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDust, setShowDust] = useState(showDustTokens);
  const [chainId, setChainId] = useState<string>("");
  const [chainForm, setChainForm] = useState({ name: "", host: "", native: "ETH" });
  const [savingChain, setSavingChain] = useState(false);

  useEffect(() => {
    setShowDust(showDustTokens);
  }, [showDustTokens]);

  useEffect(() => {
    if (address && !activeWallet) setActiveWallet(address);
  }, [address, activeWallet]);

  useEffect(() => {
    if (!activeWallet) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const qs = customChains.length ? `?chains=${encodeURIComponent(JSON.stringify(customChains))}` : "";
    fetch(`/api/onchain/${activeWallet}${qs}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load onchain data");
        return (await res.json()) as Footprint;
      })
      .then((json) => {
        if (cancelled) return;
        setData(json);
        const preferred = [...json.chains]
          .filter((c) => c.txCount > 0 || c.transferCount > 0)
          .sort((a, b) => b.txCount - a.txCount || b.transferCount - a.transferCount)[0];
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
  }, [activeWallet, customChains]);

  const interacted = useMemo(() => data?.chains.filter((c) => c.txCount > 0 || c.transferCount > 0) ?? [], [data]);
  const selected: OnchainChain | null = useMemo(() => {
    if (!data || !chainId) return null;
    return data.chains.find((c) => c.id === chainId) || null;
  }, [data, chainId]);

  const visibleTokens = useMemo(() => {
    if (!data) return [] as OnchainToken[];
    return data.tokens.filter((t) => {
      if (selected && t.chainId !== selected.id) return false;
      if (selected) return true;
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

  async function saveCustomChain(e: React.FormEvent) {
    e.preventDefault();
    if (!owner || !profileId) return;
    const name = chainForm.name.trim();
    const host = chainForm.host.trim().replace(/\/$/, "");
    if (!name || !host) return;
    setSavingChain(true);
    const next = [...customChains, { name, host, native: chainForm.native || "ETH" }];
    const supabase = createClient();
    await supabase.from("profiles").update({ custom_chains: next }).eq("id", profileId);
    setChainForm({ name: "", host: "", native: "ETH" });
    setSavingChain(false);
    window.location.reload();
  }

  if (!address && wallets.length === 0) {
    return (
      <div className="card p-3 sm:p-4 text-sm text-foreground-subtle">
        No wallet connected. Connect a wallet in Profile to aggregate this talent&apos;s onchain footprint.
      </div>
    );
  }

  const ens = data?.ens || ensName;
  const explorers = data?.explorers ?? [
    { label: "Etherscan", href: `https://etherscan.io/address/${activeWallet}` },
    ...(arkhamUrl ? [{ label: "Arkham", href: arkhamUrl }] : []),
  ];
  const dustCount = (data?.tokens || []).filter((t) => t.isDust && (!selected || t.chainId === selected.id)).length;
  const portfolioValue = selected
    ? (selected.nativeUsd || 0) +
      (data?.tokens || []).filter((t) => t.chainId === selected.id).reduce((sum, t) => sum + (t.usdValue || 0), 0)
    : data?.totalValueUsd || 0;

  const metrics = selected
    ? [
        { label: "Interactions", value: selected.txCount.toLocaleString() },
        { label: "Volume", value: usd(selected.volumeUsd) },
        { label: "Contracts", value: selected.uniqueContracts.toLocaleString() },
        { label: "Fees", value: usd(selected.feesUsd) },
        { label: "Unique tokens", value: selected.uniqueTokens.toLocaleString() },
        { label: "Token trades", value: selected.tokenTrades.toLocaleString() },
        { label: "NFT mints", value: selected.nftMints ? selected.nftMints.toLocaleString() : "—" },
        { label: `First txn on ${selected.name}`, value: selected.walletAgeDays ? `${selected.walletAgeDays}d ago` : "—" },
        { label: "Last activity", value: timeAgo(selected.lastTx) },
        { label: "Contracts deployed", value: selected.contractsDeployed.toLocaleString() },
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
        { label: "Chains used", value: interacted.length.toString() },
        { label: "Portfolio", value: usd(data?.totalValueUsd) },
      ];

  const protocolList = (data?.protocols || []).filter((p) => !selected || p.chain === selected.name);

  return (
    <div className="space-y-4">
      {wallets.length > 1 && (
        <div>
          <h3 className={HEADING}>Wallets</h3>
          <div className="flex flex-wrap gap-1.5">
            {wallets.map((w) => (
              <button
                key={w.address}
                type="button"
                onClick={() => setActiveWallet(w.address)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                  activeWallet.toLowerCase() === w.address.toLowerCase()
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border bg-surface-elevated"
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card p-3 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className={HEADING}>Wallet</h3>
            {ens && <p className="text-sm font-semibold">{ens}</p>}
            <p className="mt-0.5 font-mono text-xs text-foreground-muted break-all">{activeWallet}</p>
          </div>
          <button type="button" className="btn-ghost text-xs" onClick={() => navigator.clipboard.writeText(activeWallet)}>
            Copy
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {explorers.map((x) => (
            <a key={x.label} href={x.href} target="_blank" rel="noopener noreferrer" className="rounded-full border border-border bg-surface-elevated px-2.5 py-1 text-[11px] font-medium hover:border-primary/40 hover:text-primary">
              {x.label}
            </a>
          ))}
          <a href={`https://zkcodex.com/id/${activeWallet}`} target="_blank" rel="noopener noreferrer" className="rounded-full border border-border bg-surface-elevated px-2.5 py-1 text-[11px] font-medium hover:border-primary/40 hover:text-primary">
            zkCodex
          </a>
        </div>
      </div>

      {loading && <div className="card p-3 text-sm text-foreground-muted">Reading onchain footprint…</div>}
      {error && <div className="card p-3 text-sm text-danger">{error}</div>}

      {data && (
        <>
          <div>
            <h3 className={HEADING}>Chain</h3>
            <div className="flex flex-wrap gap-1.5">
              {interacted.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setChainId(c.id)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                    chainId === c.id ? "border-primary text-primary bg-primary/10" : "border-border bg-surface-elevated"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-foreground-subtle">Only chains this wallet has transacted or transferred on. Tap one for the full aggregator.</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Metric label="Value" value={usd(portfolioValue)} />
            <Metric label="Tokens" value={String(visibleTokens.length + (selected && Number(selected.balance) > 0 ? 1 : 0))} />
            <Metric label="Native" value={selected ? `${selected.balance} ${selected.nativeSymbol}` : "—"} />
          </div>

          <div>
            <h3 className={HEADING}>{selected ? `${selected.name} stats` : "Portfolio stats"}</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {metrics.map((m) => (
                <Metric key={m.label} label={m.label} value={m.value} />
              ))}
            </div>
          </div>

          <div>
            <h3 className={HEADING}>DeFi pools & protocols</h3>
            {protocolList.length === 0 ? (
              <div className="card text-sm text-foreground-subtle">No known protocol interactions on this chain yet.</div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {protocolList.map((p) => (
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
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className={`${HEADING} mb-0`}>Tokens</h3>
              {owner && !selected && dustCount > 0 && (
                <button type="button" className="btn-ghost text-[11px]" onClick={toggleDust}>
                  {showDust ? "Hide dust under $1" : `Show dust (${dustCount})`}
                </button>
              )}
            </div>
            {visibleTokens.length === 0 && !(selected && Number(selected.balance) > 0) ? (
              <div className="card text-sm text-foreground-subtle">No tokens on this chain.</div>
            ) : (
              <div className="card divide-y divide-border/70 overflow-hidden p-0">
                {selected && Number(selected.balance) > 0 && (
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

          <ActivityHeatmap days={selected?.activityDays || data.chains.flatMap((c) => c.activityDays || [])} />
        </>
      )}

      {owner && profileId && (
        <form onSubmit={saveCustomChain} className="card space-y-2 p-3">
          <h3 className={HEADING}>Import a network</h3>
          <p className="text-[11px] text-foreground-subtle">
            Add a Blockscout-compatible explorer to pull tokens, NFTs and stats from a chain that is not listed yet.
          </p>
          <input className="input text-sm" value={chainForm.name} onChange={(e) => setChainForm((s) => ({ ...s, name: e.target.value }))} placeholder="KiiChain" />
          <input className="input text-sm" value={chainForm.host} onChange={(e) => setChainForm((s) => ({ ...s, host: e.target.value }))} placeholder="https://explorer.example.com" />
          <input className="input text-sm" value={chainForm.native} onChange={(e) => setChainForm((s) => ({ ...s, native: e.target.value }))} placeholder="Native symbol" />
          <button type="submit" className="btn-secondary text-xs" disabled={savingChain}>
            {savingChain ? "Saving…" : "Add network"}
          </button>
        </form>
      )}
    </div>
  );
}
