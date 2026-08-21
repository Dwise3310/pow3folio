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
    if (customChains.length || importedTokens.length || (wallets && wallets.length > 1)) return;
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
  }, [walletAddress, customChains.length, importedTokens.length, wallets]);

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
        customChains={customChains.length ? customChains : meta?.custom_chains || []}
        publicChainIds={publicChainIds ?? meta?.public_chain_ids ?? null}
        importedTokens={importedTokens.length ? importedTokens : meta?.imported_tokens || []}
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
