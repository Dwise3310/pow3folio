"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Collectible } from "@/types/database";
import type { WalletNft } from "@/lib/nfts";

type Props = {
  userId: string;
  initialItems: Collectible[];
  walletAddress: string | null;
};

function sortItems(list: Collectible[]) {
  return [...list].sort((a, b) => {
    const ao = a.sort_order ?? 0;
    const bo = b.sort_order ?? 0;
    if (ao !== bo) return ao - bo;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

function nftKey(chain: string | null, tokenId: string | null) {
  return `${(chain || "").toLowerCase()}|${tokenId || ""}`;
}

export default function CollectibleManager({ userId, initialItems, walletAddress }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<Collectible[]>(() => sortItems(initialItems));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  async function importFromWallet() {
    if (!walletAddress) {
      setError("Connect a wallet in Profile first. Import only reads NFTs that address actually holds.");
      return;
    }
    setLoading(true);
    setError(null);
    setHint(null);
    try {
      const res = await fetch(`/api/onchain/${walletAddress}/nfts`);
      if (!res.ok) throw new Error("Could not read NFTs for this wallet");
      const json = (await res.json()) as { nfts?: WalletNft[] };
      const found = json.nfts ?? [];
      if (!found.length) {
        setHint("No ERC-721 / ERC-1155 tokens found on Ethereum, Base, Arbitrum, Optimism or Polygon.");
        setLoading(false);
        return;
      }

      const existing = new Set(items.map((i) => nftKey(i.chain, i.token_id)));
      const fresh = found.filter((n) => n.token_id && !existing.has(nftKey(n.chain, n.token_id)));
      if (!fresh.length) {
        setHint(`Already imported. Wallet currently holds ${found.length} NFT${found.length === 1 ? "" : "s"}.`);
        setLoading(false);
        return;
      }

      const supabase = createClient();
      let maxOrder = items.reduce((m, i) => Math.max(m, i.sort_order ?? 0), -1);
      const rows = fresh.map((n) => {
        maxOrder += 1;
        return {
          user_id: userId,
          kind: "nft",
          title: n.title,
          description: n.description,
          url: n.url,
          image_url: n.image_url,
          chain: n.chain,
          collection_name: n.collection_name,
          token_id: n.token_id,
          acquired_at: n.acquired_at,
          tags: ["imported"],
          is_visible: true,
          sort_order: maxOrder,
        };
      });

      const { data, error: err } = await supabase.from("collectibles").insert(rows).select();
      if (err) {
        setError(
          err.message.includes("collectibles") || err.code === "42P01"
            ? "Run the collectibles SQL in Supabase first."
            : err.message
        );
        setLoading(false);
        return;
      }
      setItems((prev) => sortItems([...prev, ...((data as Collectible[]) ?? [])]));
      setHint(`Imported ${rows.length} NFT${rows.length === 1 ? "" : "s"} held by this wallet.`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this NFT from the profile?")) return;
    const supabase = createClient();
    const { error: err } = await supabase.from("collectibles").delete().eq("id", id).eq("user_id", userId);
    if (err) {
      setError(err.message);
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
    router.refresh();
  }

  async function toggleVisible(item: Collectible) {
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("collectibles")
      .update({ is_visible: !item.is_visible })
      .eq("id", item.id)
      .select()
      .single();
    if (err) {
      setError(err.message);
      return;
    }
    setItems((prev) => prev.map((i) => (i.id === item.id ? (data as Collectible) : i)));
    router.refresh();
  }

  async function moveItem(index: number, direction: "up" | "down") {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= items.length) return;
    setReordering(true);
    setError(null);
    const next = [...items];
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    const normalized = next.map((item, i) => ({ ...item, sort_order: i }));
    const supabase = createClient();
    const results = await Promise.all(
      normalized.map((item) =>
        supabase.from("collectibles").update({ sort_order: item.sort_order }).eq("id", item.id).eq("user_id", userId)
      )
    );
    setReordering(false);
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      setError(failed.error.message);
      return;
    }
    setItems(normalized);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="card space-y-3">
        <h2 className="font-semibold">NFTs held by this wallet</h2>
        <p className="text-sm text-foreground-muted">
          Import reads Ethereum, Base, Arbitrum, Optimism and Polygon via public explorers. Links resolve to OpenSea. No upload form, so a talent cannot showcase a Pudgy they do not hold.
        </p>
        {!walletAddress && (
          <p className="text-sm text-foreground-subtle">
            Connect a wallet in Profile first.{" "}
            <a href="/dashboard/profile" className="text-primary hover:underline">
              Open Profile
            </a>
          </p>
        )}
        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>
        )}
        {hint && <p className="text-sm text-foreground-muted">{hint}</p>}
        <button type="button" className="btn-primary" disabled={loading || !walletAddress} onClick={importFromWallet}>
          {loading ? "Reading wallet…" : items.length ? "Refresh from wallet" : "Import NFTs from wallet"}
        </button>
      </div>

      <div className="space-y-3">
        <h2 className="font-semibold">On profile ({items.length})</h2>
        <p className="text-xs text-foreground-subtle">Hide, reorder or remove. Import again to pick up new holdings.</p>
        {items.length === 0 && <p className="text-sm text-foreground-subtle">None imported yet.</p>}
        {items.map((item, index) => (
          <div key={item.id} className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 gap-3">
              <div className="flex flex-col gap-1 shrink-0">
                <button
                  type="button"
                  disabled={reordering || index === 0}
                  onClick={() => moveItem(index, "up")}
                  className="btn-ghost h-8 w-8 p-0 text-sm disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={reordering || index === items.length - 1}
                  onClick={() => moveItem(index, "down")}
                  className="btn-ghost h-8 w-8 p-0 text-sm disabled:opacity-30"
                >
                  ↓
                </button>
              </div>
              {item.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image_url} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-elevated text-[10px] uppercase text-foreground-subtle">
                  NFT
                </div>
              )}
              <div className="min-w-0">
                <p className="font-medium break-words">{item.title}</p>
                <p className="mt-0.5 text-xs text-foreground-muted">
                  {[item.chain, item.collection_name, item.token_id ? `#${item.token_id}` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="mt-0.5 text-xs text-foreground-subtle">{item.is_visible ? "Public" : "Hidden"}</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {item.url && (
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn-ghost text-xs">
                  OpenSea
                </a>
              )}
              <button type="button" onClick={() => toggleVisible(item)} className="btn-ghost text-xs">
                {item.is_visible ? "Hide" : "Show"}
              </button>
              <button type="button" onClick={() => handleDelete(item.id)} className="btn-ghost text-xs text-danger">
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
