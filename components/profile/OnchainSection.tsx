"use client";

import { useEffect, useState } from "react";
import CollectibleCard from "@/components/collectibles/CollectibleCard";
import OnchainFootprint, { type NamedWallet } from "@/components/profile/OnchainFootprint";
import type { Collectible, CustomChain } from "@/types/database";
import type { ImportedTokenRef } from "@/lib/onchain";

type Meta = {
  custom_chains?: CustomChain[] | null;
  public_chain_ids?: string[] | null;
  imported_tokens?: ImportedTokenRef[] | null;
  extra_wallets?: NamedWallet[] | null;
  show_dust_tokens?: boolean | null;
};

function withoutPrefs(chains: CustomChain[] | null | undefined): CustomChain[] {
  return (chains || []).filter((c) => c.id !== "__pow3_prefs" && c.name !== "__pow3_prefs");
}

function prefsFromChains(chains: CustomChain[] | null | undefined) {
  const row = (chains || []).find((c) => c.id === "__pow3_prefs" || c.name === "__pow3_prefs") as
    | (CustomChain & { public_chain_ids?: string[]; imported_tokens?: ImportedTokenRef[] })
    | undefined;
  if (!row) return {};
  return {
    public_chain_ids: row.public_chain_ids,
    imported_tokens: row.imported_tokens,
  };
}

export default function OnchainSection({
  profileUrl,
  nfts,
  walletAddress,
  ensName,
  arkhamUrl,
  showDustTokens = false,
  wallets = [],
  customChains = [],
  publicChainIds = null,
  importedTokens = [],
  owner = false,
  profileId = null,
}: {
  profileUrl: string;
  nfts: Collectible[];
  walletAddress: string | null;
  ensName: string | null;
  arkhamUrl: string | null;
  showDustTokens?: boolean;
  wallets?: NamedWallet[];
  customChains?: CustomChain[];
  publicChainIds?: string[] | null;
  importedTokens?: ImportedTokenRef[];
  owner?: boolean;
  profileId?: string | null;
}) {
  const [meta, setMeta] = useState<Meta | null>(null);

  useEffect(() => {
    if (!walletAddress) return;
    let cancelled = false;
    fetch(`/api/onchain/meta/${walletAddress}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: Meta | null) => {
        if (!cancelled && json) setMeta(json);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  const rawChains = customChains.length ? customChains : meta?.custom_chains || [];
  const hiddenPrefs = prefsFromChains(rawChains);
  const extraWallets = (meta?.extra_wallets || []).filter((w) => w?.address);
  const mergedWallets =
    wallets.length > 0
      ? wallets
      : [
          ...(walletAddress ? [{ address: walletAddress, label: "Primary" }] : []),
          ...extraWallets.map((w) => ({ address: w.address, label: w.label || w.address.slice(0, 6) })),
        ];

  return (
    <div className="space-y-6">
      <OnchainFootprint
        address={walletAddress}
        ensName={ensName}
        arkhamUrl={arkhamUrl}
        showDustTokens={meta?.show_dust_tokens ?? showDustTokens}
        wallets={mergedWallets}
        customChains={withoutPrefs(rawChains)}
        publicChainIds={publicChainIds ?? meta?.public_chain_ids ?? hiddenPrefs.public_chain_ids ?? null}
        importedTokens={
          importedTokens.length ? importedTokens : meta?.imported_tokens || hiddenPrefs.imported_tokens || []
        }
        owner={owner}
        profileId={profileId}
      />
      <div>
        <h3 className="section-heading">NFTs held</h3>
        {nfts.length === 0 ? (
          <div className="card text-sm text-foreground-subtle">
            No imported NFTs yet. The talent imports holdings from the connected wallet so only owned items appear.
          </div>
        ) : (
          <div className="nft-grid">
            {nfts.map((c) => (
              <CollectibleCard key={c.id} item={c} profileUrl={profileUrl} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
