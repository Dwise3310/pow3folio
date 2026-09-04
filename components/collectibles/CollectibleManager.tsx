"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Collectible } from "@/types/database";
import type { WalletNft } from "@/lib/nfts";
import type { NamedWallet } from "@/components/profile/OnchainFootprint";
import { parseNftQuery } from "@/lib/nft-url";
import CollectibleThumb from "@/components/collectibles/CollectibleThumb";

type Props = {
  userId: string;
  initialItems: Collectible[];
  walletAddress: string | null;
  wallets?: NamedWallet[];
};

function sortItems(list: Collectible[]) {
  return [...list].sort((a, b) => {
    const ao = a.sort_order ?? 0;
    const bo = b.sort_order ?? 0;
    if (ao !== bo) return ao - bo;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

function nftKey(chain: string | null, contractHint: string | null, tokenId: string | null) {
  return `${(chain || "").toLowerCase()}|${(contractHint || "").toLowerCase()}|${tokenId == null ? "" : String(tokenId)}`;
}

export default function CollectibleManager({ userId, initialItems, walletAddress, wallets = [] }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<Collectible[]>(() => sortItems(initialItems));
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [reordering, setReordering] = useState(false);
  const [targetWallet, setTargetWallet] = useState(walletAddress || wallets[0]?.address || "");

  async function persistArtwork(item: Collectible, imageUrl: string) {
    if (!imageUrl || imageUrl === item.image_url) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("collectibles")
      .update({ image_url: imageUrl })
      .eq("id", item.id)
      .eq("user_id", userId)
      .select()
      .single();
    if (data) {
      setItems((prev) => prev.map((row) => (row.id === item.id ? (data as Collectible) : row)));
    }
  }

  async function insertNfts(fresh: WalletNft[], alreadyLabel: string) {
    const existingByKey = new Map(
      items.map((i) => {
        const ca = (i.tags || []).find((t) => t.startsWith("ca:"))?.slice(3) || "";
        return [nftKey(i.chain, ca, i.token_id), i] as const;
      })
    );
    const unique: WalletNft[] = [];
    const refresh: Array<{ row: Collectible; nft: WalletNft }> = [];
    for (const n of fresh) {
      if (n.token_id == null || String(n.token_id).trim() === "") continue;
      const found = existingByKey.get(nftKey(n.chain, n.contract, n.token_id));
      if (!found) unique.push(n);
      else if ((!found.image_url && n.image_url) || (n.image_url && n.image_url !== found.image_url) || (n.title && n.title !== found.title)) {
        refresh.push({ row: found, nft: n });
      }
    }

    const supabase = createClient();
    let nextItems = items;

    if (refresh.length) {
      const results = await Promise.all(
        refresh.map(({ row, nft }) =>
          supabase
            .from("collectibles")
            .update({
              image_url: nft.image_url || row.image_url,
              title: nft.title || row.title,
              description: nft.description || row.description,
              url: nft.url || row.url,
              collection_name: nft.collection_name || row.collection_name,
            })
            .eq("id", row.id)
            .eq("user_id", userId)
            .select()
            .single()
        )
      );
      const updated = results.map((r) => r.data as Collectible | null).filter((x): x is Collectible => !!x);
      if (updated.length) {
        nextItems = nextItems.map((item) => updated.find((u) => u.id === item.id) || item);
        setItems(sortItems(nextItems));
      }
    }

    if (!unique.length) {
      setHint(
        refresh.length
          ? `Updated artwork on ${refresh.length} NFT${refresh.length === 1 ? "" : "s"}.`
          : alreadyLabel
      );
      if (refresh.length) router.refresh();
      return;
    }

    let maxOrder = nextItems.reduce((m, i) => Math.max(m, i.sort_order ?? 0), -1);
    const rows = unique.map((n) => {
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
        tags: ["imported", n.contract ? `ca:${n.contract}` : "", targetWallet ? `wallet:${targetWallet}` : ""].filter(Boolean),
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
      return;
    }
    setItems(sortItems([...nextItems, ...((data as Collectible[]) ?? [])]));
    const extra = refresh.length ? ` Updated ${refresh.length} existing image${refresh.length === 1 ? "" : "s"}.` : "";
    setHint(`Imported ${rows.length} NFT${rows.length === 1 ? "" : "s"} held by this wallet.${extra}`);
    router.refresh();
  }

  async function importFromWallet() {
    if (!targetWallet) {
      setError("Connect a wallet in Profile first. Import only reads NFTs that address actually holds.");
      return;
    }
    setLoading(true);
    setError(null);
    setHint(null);
    try {
      const res = await fetch(`/api/onchain/${targetWallet}/nfts`);
      if (!res.ok) throw new Error("Could not read NFTs for this wallet");
      const json = (await res.json()) as { nfts?: WalletNft[] };
      const found = json.nfts ?? [];
      if (!found.length) {
        setHint("No ERC-721 / ERC-1155 tokens found on the indexed chains.");
      } else {
        await insertNfts(
          found,
          `Already imported. Wallet currently holds ${found.length} NFT${found.length === 1 ? "" : "s"}.`
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    }
    setLoading(false);
  }

  async function searchByContract(e: React.FormEvent) {
    e.preventDefault();
    if (!targetWallet) {
      setError("Connect a wallet in Profile first.");
      return;
    }
    setSearching(true);
    setError(null);
    setHint("Checking NFT…");
    try {
      const importRes = await fetch("/api/nft/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: query, walletAddress: targetWallet }),
      });
      const imported = (await importRes.json()) as {
        verified?: boolean;
        name?: string;
        collection?: string | null;
        chain?: string;
        contractAddress?: string;
        tokenId?: string;
        image?: string | null;
        description?: string | null;
        marketplaceUrl?: string;
        error?: string;
      };
      if (imported.verified && imported.contractAddress && imported.tokenId != null && imported.tokenId !== "") {
        await insertNfts(
          [
            {
              title: imported.name || "NFT",
              description: imported.description || null,
              url: imported.marketplaceUrl || "",
              image_url: imported.image || null,
              chain: imported.chain || "",
              collection_name: imported.collection || null,
              token_id: imported.tokenId,
              acquired_at: null,
              contract: imported.contractAddress,
            },
          ],
          "That NFT is already on the profile."
        );
        setSearching(false);
        return;
      }
      if (imported.error && imported.contractAddress) {
        setHint(imported.error);
        setSearching(false);
        return;
      }

      const parsed = parseNftQuery(query);
      const contract = "contract" in parsed ? parsed.contract : "";
      const tokenId = "tokenId" in parsed ? parsed.tokenId : "";
      if (!contract) {
        setError(imported.error || "Paste a marketplace URL or a contract address.");
        setSearching(false);
        return;
      }
      const qs = new URLSearchParams({ contract });
      if (tokenId !== "") qs.set("tokenId", tokenId);
      const res = await fetch(`/api/onchain/${targetWallet}/lookup?${qs.toString()}`);
      if (!res.ok) throw new Error("Lookup failed");
      const json = (await res.json()) as {
        nfts?: WalletNft[];
        tokens?: Array<{ symbol: string; chain: string; balance: string; href: string }>;
      };
      const nfts = json.nfts ?? [];
      const tokens = json.tokens ?? [];
      if (!nfts.length && !tokens.length) {
        setHint(imported.error || "This wallet does not hold that contract on the indexed chains.");
      } else {
        if (nfts.length) await insertNfts(nfts, "That NFT is already on the profile.");
        if (tokens.length) {
          const names = tokens.map((t) => `${t.symbol} on ${t.chain} (${t.balance})`).join(", ");
          setHint((prev) =>
            [prev, `Token found: ${names}. It appears in Onchain Stats if the balance is still held.`]
              .filter(Boolean)
              .join(" ")
          );
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    }
    setSearching(false);
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
          Paste any marketplace URL. Pow3Folio extracts the contract, verifies this wallet owns it, then resolves artwork.
        </p>
        {wallets.length > 1 && (
          <label className="block text-xs">
            Import into
            <select className="input mt-1 text-sm" value={targetWallet} onChange={(e) => setTargetWallet(e.target.value)}>
              {wallets.map((w) => (
                <option key={w.address} value={w.address}>
                  {w.label} · {w.address.slice(0, 6)}...{w.address.slice(-4)}
                </option>
              ))}
            </select>
          </label>
        )}
        {!targetWallet && (
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
        <button type="button" className="btn-primary" disabled={loading || !targetWallet} onClick={importFromWallet}>
          {loading ? "Reading wallet…" : items.length ? "Refresh from wallet" : "Import NFTs from wallet"}
        </button>
        <form onSubmit={searchByContract} className="space-y-2 border-t border-border pt-3">
          <label className="label">Paste NFT URL</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="input text-sm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="https://opensea.io/item/polygon/0x…/854"
            />
            <button type="submit" className="btn-secondary shrink-0" disabled={searching || !targetWallet}>
              {searching ? "Importing…" : "Import if held"}
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-3">
        <h2 className="font-semibold">On profile ({items.length})</h2>
        <p className="text-xs text-foreground-subtle">Hide, reorder or remove. Import again to pick up new holdings.</p>
        {items.length === 0 && <p className="text-sm text-foreground-subtle">None imported yet.</p>}
        {items.map((item, index) => (
          <div key={item.id} className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 gap-3">
              <div className="flex flex-col gap-1 shrink-0">
                <button type="button" disabled={reordering || index === 0} onClick={() => moveItem(index, "up")} className="btn-ghost h-8 w-8 p-0 text-sm disabled:opacity-30">
                  ↑
                </button>
                <button type="button" disabled={reordering || index === items.length - 1} onClick={() => moveItem(index, "down")} className="btn-ghost h-8 w-8 p-0 text-sm disabled:opacity-30">
                  ↓
                </button>
              </div>
              <CollectibleThumb
                item={item}
                className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-elevated"
                onResolved={(url) => persistArtwork(item, url)}
              />
              <div className="min-w-0">
                <p className="font-medium break-words">{item.title}</p>
                <p className="mt-0.5 text-xs text-foreground-muted">
                  {[item.chain, item.collection_name, item.token_id != null && String(item.token_id) !== "" ? `#${item.token_id}` : null].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-0.5 text-xs text-foreground-subtle">{item.is_visible ? "Public" : "Hidden"}</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {item.url && (
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn-ghost text-xs">
                  Open
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
