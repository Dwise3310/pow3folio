export type WalletNft = {
  title: string;
  description: string | null;
  url: string;
  image_url: string | null;
  chain: string;
  collection_name: string | null;
  token_id: string;
  acquired_at: string | null;
  contract: string;
};

const NFT_CHAINS = [
  {
    id: "eth",
    name: "Ethereum",
    host: "https://eth.blockscout.com",
    opensea: "ethereum",
  },
  {
    id: "base",
    name: "Base",
    host: "https://base.blockscout.com",
    opensea: "base",
  },
  {
    id: "arb",
    name: "Arbitrum",
    host: "https://arbitrum.blockscout.com",
    opensea: "arbitrum",
  },
  {
    id: "op",
    name: "Optimism",
    host: "https://optimism.blockscout.com",
    opensea: "optimism",
  },
  {
    id: "polygon",
    name: "Polygon",
    host: "https://polygon.blockscout.com",
    opensea: "matic",
  },
] as const;

function isAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function isHttp(url: string | null | undefined) {
  return !!url && /^https?:\/\//i.test(url);
}

async function getJson(url: string, timeoutMs = 9000): Promise<unknown | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

type BlockscoutNft = {
  id?: string;
  image_url?: string | null;
  media_url?: string | null;
  metadata?: { name?: string; description?: string; image?: string } | null;
  token?: { address_hash?: string; name?: string; symbol?: string };
};

function marketplaceUrl(openseaChain: string, contract: string, tokenId: string) {
  return `https://opensea.io/item/${openseaChain}/${contract}/${tokenId}`;
}

function magicEdenUrl(openseaChain: string, contract: string, tokenId: string) {
  const chain = openseaChain === "matic" ? "polygon" : openseaChain;
  return `https://magiceden.io/item-details/${chain}/${contract}/${tokenId}`;
}

export async function loadWalletNfts(rawAddress: string): Promise<WalletNft[]> {
  const address = rawAddress.trim().toLowerCase();
  if (!isAddress(address)) return [];

  const pages = await Promise.all(
    NFT_CHAINS.map(async (chain) => {
      const json = (await getJson(
        `${chain.host}/api/v2/addresses/${address}/nft?type=ERC-721,ERC-1155`
      )) as { items?: BlockscoutNft[] } | null;

      return (json?.items ?? []).slice(0, 24).map((item) => {
        const tokenId = String(item.id || "").trim();
        const contract = (item.token?.address_hash || "").toLowerCase();
        const title =
          item.metadata?.name?.trim() ||
          (item.token?.name && tokenId ? `${item.token.name} #${tokenId.slice(0, 8)}` : null) ||
          item.token?.symbol ||
          "NFT";
        const image =
          (isHttp(item.image_url) && item.image_url) ||
          (isHttp(item.media_url) && item.media_url) ||
          (isHttp(item.metadata?.image) && item.metadata?.image) ||
          null;
        const dateTrait = Array.isArray((item.metadata as { attributes?: Array<{ display_type?: string; value?: unknown }> } | null)?.attributes)
          ? (item.metadata as { attributes: Array<{ display_type?: string; value?: unknown }> }).attributes.find(
              (a) => a.display_type === "date"
            )
          : null;
        let acquired: string | null = null;
        if (typeof dateTrait?.value === "number") {
          const ms = dateTrait.value > 10_000_000_000 ? dateTrait.value : dateTrait.value * 1000;
          acquired = new Date(ms).toISOString().slice(0, 10);
        }

        return {
          title: title.slice(0, 120),
          description: item.metadata?.description?.slice(0, 400) || null,
          url: contract && tokenId ? marketplaceUrl(chain.opensea, contract, tokenId) : magicEdenUrl(chain.opensea, contract, tokenId),
          image_url: image,
          chain: chain.name,
          collection_name: item.token?.name || null,
          token_id: tokenId,
          acquired_at: acquired,
          contract,
        } satisfies WalletNft;
      });
    })
  );

  const seen = new Set<string>();
  const out: WalletNft[] = [];
  for (const nft of pages.flat()) {
    const key = `${nft.chain}|${nft.contract}|${nft.token_id}`;
    if (!nft.token_id || seen.has(key)) continue;
    seen.add(key);
    out.push(nft);
    if (out.length >= 80) break;
  }
  return out;
}
