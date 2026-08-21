import { resolveMediaUrl, type WalletNft } from "@/lib/nfts";
import { getJson } from "@/lib/onchain";

const HOSTS = [
  { name: "Polygon", host: "https://polygon.blockscout.com", opensea: "matic" },
  { name: "Ethereum", host: "https://eth.blockscout.com", opensea: "ethereum" },
  { name: "Base", host: "https://base.blockscout.com", opensea: "base" },
  { name: "Arbitrum", host: "https://arbitrum.blockscout.com", opensea: "arbitrum" },
  { name: "Optimism", host: "https://optimism.blockscout.com", opensea: "optimism" },
  { name: "BNB Chain", host: "https://bsc.blockscout.com", opensea: "bsc" },
] as const;

const OPENSEA_CHAINS = ["base", "matic", "ethereum", "arbitrum", "optimism", "bsc", "polygon"] as const;

function pick(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as {
    image_url?: string;
    media_url?: string;
    animation_url?: string;
    metadata?: { image?: unknown; image_url?: unknown };
    token?: { icon_url?: string };
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

async function fromOpenSea(contract: string, tokenId: string, hint?: string | null) {
  const preferred = (hint || "").toLowerCase();
  const order = [...OPENSEA_CHAINS].sort((a, b) => {
    const ah = preferred && (a.includes(preferred) || (preferred.includes("polygon") && a === "matic")) ? 0 : 1;
    const bh = preferred && (b.includes(preferred) || (preferred.includes("polygon") && b === "matic")) ? 0 : 1;
    return ah - bh;
  });
  for (const chain of order) {
    const json = (await getJson(
      `https://api.opensea.io/api/v2/chain/${chain === "matic" ? "matic" : chain}/contract/${contract}/nfts/${tokenId}`
    )) as { nft?: { image_url?: string; name?: string; animation_url?: string; opensea_url?: string; collection?: string } } | null;
    const nft = json?.nft;
    const image = resolveMediaUrl(nft?.image_url || nft?.animation_url);
    if (!image) continue;
    return {
      image_url: image,
      title: nft?.name || `NFT #${tokenId}`,
      url: nft?.opensea_url || `https://opensea.io/item/${chain === "matic" ? "polygon" : chain}/${contract}/${tokenId}`,
      chain: chain === "matic" ? "Polygon" : chain,
      collection_name: nft?.collection || null,
    };
  }
  return null;
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
    const ah = hint && (a.name.toLowerCase().includes(hint) || (hint.includes("kii") && a.name === "Polygon")) ? 0 : 1;
    const bh = hint && (b.name.toLowerCase().includes(hint) || (hint.includes("kii") && b.name === "Polygon")) ? 0 : 1;
    return ah - bh;
  });

  const blockscout = await Promise.all(
    ordered.map(async (chain) => {
      try {
        const res = await fetch(`${chain.host}/api/v2/tokens/${ca}/instances/${id}`, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) return null;
        const item = (await res.json()) as {
          image_url?: string;
          media_url?: string;
          metadata?: { name?: string; image?: unknown };
          token?: { address_hash?: string; name?: string; icon_url?: string };
          id?: string;
        };
        const image_url = pick(item);
        if (!image_url) return null;
        const title = item.metadata?.name || item.token?.name || `NFT #${id}`;
        return {
          image_url,
          title: String(title).slice(0, 120),
          url: `https://opensea.io/item/${chain.opensea === "matic" ? "polygon" : chain.opensea}/${ca}/${id}`,
          chain: chain.name,
          collection_name: item.token?.name || null,
        };
      } catch {
        return null;
      }
    })
  );
  const hit = blockscout.find(Boolean);
  if (hit) return hit;
  return fromOpenSea(ca, id, hint);
}
