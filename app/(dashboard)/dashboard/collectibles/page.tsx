import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CollectibleManager from "@/components/collectibles/CollectibleManager";
import OnchainFootprint from "@/components/profile/OnchainFootprint";
import WalletAutoScan from "@/components/collectibles/WalletAutoScan";
import ExtraWallets from "@/components/profile/ExtraWallets";
import type { Collectible, CustomChain, ExtraWallet, Profile } from "@/types/database";

export default async function CollectiblesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: items }, { data: profile }] = await Promise.all([
    supabase
      .from("collectibles")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
  ]);

  const p = (profile || {}) as Partial<Profile>;
  const walletAddress = p.wallet_address || null;
  const extra = (p.extra_wallets || []).filter((w) => w?.address);
  const wallets = [
    ...(walletAddress ? [{ address: walletAddress, label: "Primary" }] : []),
    ...extra.map((w) => ({ address: w.address, label: w.label || w.address.slice(0, 6) })),
  ];
  const ensName = p.ens_name || null;
  const arkhamUrl = walletAddress ? `https://arkm.com/explorer/address/${walletAddress}` : null;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="container-app flex h-14 items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary">
              <span className="text-xs font-bold">P3</span>
            </div>
            <span className="font-semibold">
              Pow<span className="text-primary">3</span>Folio
            </span>
          </Link>
          <Link href="/dashboard" className="btn-ghost text-sm">
            ← Dashboard
          </Link>
        </div>
      </header>

      <main className="container-app max-w-2xl py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Onchain</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Live footprint from connected wallets, plus NFTs actually held on those addresses.
          </p>
        </div>

        <WalletAutoScan lastScanAt={p.last_wallet_scan_at || null} />
        <ExtraWallets profileId={user.id} initial={extra} />

        <div className="mb-8">
          <OnchainFootprint
            address={walletAddress}
            ensName={ensName}
            arkhamUrl={arkhamUrl}
            owner
            profileId={user.id}
            showDustTokens={p.show_dust_tokens === true}
            wallets={wallets}
            customChains={(p.custom_chains as CustomChain[]) || []}
          />
        </div>

        <CollectibleManager
          userId={user.id}
          initialItems={(items as Collectible[]) ?? []}
          walletAddress={walletAddress}
          wallets={wallets}
        />
      </main>
    </div>
  );
}
