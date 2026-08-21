"use client";

import CollectibleCard from "@/components/collectibles/CollectibleCard";
import OnchainFootprint, { type NamedWallet } from "@/components/profile/OnchainFootprint";
import type { Collectible, CustomChain } from "@/types/database";

export default function OnchainSection({
  profileUrl,
  nfts,
  walletAddress,
  ensName,
  arkhamUrl,
  showDustTokens = false,
  wallets = [],
  customChains = [],
}: {
  profileUrl: string;
  nfts: Collectible[];
  walletAddress: string | null;
  ensName: string | null;
  arkhamUrl: string | null;
  showDustTokens?: boolean;
  wallets?: NamedWallet[];
  customChains?: CustomChain[];
}) {
  return (
    <div className="space-y-6">
      <OnchainFootprint
        address={walletAddress}
        ensName={ensName}
        arkhamUrl={arkhamUrl}
        showDustTokens={showDustTokens}
        wallets={wallets}
        customChains={customChains}
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
