import { resolveMediaUrl, type WalletNft } from "@/lib/nfts";

const HOSTS = [
  { name: "Polygon", host: "https://polygon.blockscout.com", opensea: "matic" },
  { name: "Ethereum", host: "https://eth.blockscout.com", opensea: "ethereum" },
  { name: "Base", host: "https://base.blockscout.com", opensea: "base" },
  { name: "Arbitrum", host: "https://arbitrum.blockscout.com", opensea: "arbitrum" },
  { name: "Optimism", host: "https://optimism.blockscout.com", opensea: "optimism" },
  { name: "BNB Chain", host: "https://bsc.blockscout.com", opensea: "bsc" },
] as const;

function pick(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as {
    image_url?: string;
    media_url?: string;
    animation_url?: string;
    metadata?: { image?: unknown; image_url?: unknown };
    token?: { icon_url?: string; address_hash?: string; name?: string };
    id?: string;
  };
  const metaImage =
    typeof item.metadata?.image === "string"
      ? item.metadata.image
      : typeof item.metadata?.image_url === "string"
        ? item.metadata.image_url
        : null;
  return (
    resolveMediaUrl(item.image_url) ||
    resolveMediaUrl(item.media_url) ||
    resolveMediaUrl(metaImage) ||
    resolveMediaUrl(item.token?.icon_url) ||
    resolveMediaUrl(item.animation_url)
  );
}

export async function fetchNftArtwork(
  contract: string,
  tokenId: string,
  chainHint?: string | null
): Promise<Pick<WalletNft, "image_url" | "title" | "url" | "chain" | "collection_name"> | null> {
  const ca = contract.trim().toLowerCase();
  const id = tokenId.trim();
  if (!ca || !id) return null;
  const hint = (chainHint || "").toLowerCase();
  const ordered = [...HOSTS].sort((a, b) => {
    const ah = hint && a.name.toLowerCase().includes(hint) ? 0 : 1;
    const bh = hint && b.name.toLowerCase().includes(hint) ? 0 : 1;
    return ah - bh;
  });
  for (const chain of ordered) {
    try {
      const res = await fetch(`${chain.host}/api/v2/tokens/${ca}/instances/${id}`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) continue;
      const item = (await res.json()) as {
        image_url?: string;
        media_url?: string;
        metadata?: { name?: string; image?: unknown };
        token?: { address_hash?: string; name?: string; icon_url?: string };
        id?: string;
      };
      const image_url = pick(item);
      if (!image_url) continue;
      const title = item.metadata?.name || item.token?.name || `NFT #${id}`;
      return {
        image_url,
        title: String(title).slice(0, 120),
        url: `https://opensea.io/item/${chain.opensea === "matic" ? "polygon" : chain.opensea}/${ca}/${id}`,
        chain: chain.name,
        collection_name: item.token?.name || null,
      };
    } catch {
      continue;
    }
  }
  return null;
}
