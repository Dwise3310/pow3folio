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
  { id: "eth", name: "Ethereum", host: "https://eth.blockscout.com", opensea: "ethereum" },
  { id: "base", name: "Base", host: "https://base.blockscout.com", opensea: "base" },
  { id: "arb", name: "Arbitrum", host: "https://arbitrum.blockscout.com", opensea: "arbitrum" },
  { id: "op", name: "Optimism", host: "https://optimism.blockscout.com", opensea: "optimism" },
  { id: "polygon", name: "Polygon", host: "https://polygon.blockscout.com", opensea: "matic" },
] as const;

function isAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function isHttp(url: string | null | undefined) {
  return !!url && /^https?:\/\//i.test(url);
}

async function getJson(url: string, timeoutMs = 10000): Promise<unknown | null> {
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

function pageQuery(baseUrl: string, params: Record<string, unknown> | null | undefined) {
  if (!params) return null;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;
    qs.set(key, String(value));
  }
  const clean = baseUrl.split("?")[0];
  const existing = baseUrl.includes("?") ? baseUrl.slice(baseUrl.indexOf("?") + 1) : "";
  const first = new URLSearchParams(existing);
  for (const [key, value] of qs.entries()) first.set(key, value);
  return `${clean}?${first.toString()}`;
}

async function getPagedItems<T>(url: string, maxPages = 8): Promise<T[]> {
  const out: T[] = [];
  let next: string | null = url;
  for (let i = 0; i < maxPages && next; i += 1) {
    const json = (await getJson(next)) as { items?: T[]; next_page_params?: Record<string, unknown> } | null;
    out.push(...(json?.items ?? []));
    next = pageQuery(url, json?.next_page_params);
  }
  return out;
}

type BlockscoutNft = {
  id?: string;
  image_url?: string | null;
  media_url?: string | null;
  metadata?: { name?: string; description?: string; image?: string } | null;
  token?: { address_hash?: string; name?: string; symbol?: string };
  owner?: { hash?: string };
};

function marketplaceUrl(openseaChain: string, contract: string, tokenId: string) {
  return `https://opensea.io/item/${openseaChain === "matic" ? "polygon" : openseaChain}/${contract}/${tokenId}`;
}

function mapNft(item: BlockscoutNft, chainName: string, opensea: string): WalletNft | null {
  const tokenId = String(item.id || "").trim();
  const contract = (item.token?.address_hash || "").toLowerCase();
  if (!tokenId) return null;
  const title =
    item.metadata?.name?.trim() ||
    (item.token?.name && tokenId ? `${item.token.name} #${tokenId.slice(0, 10)}` : null) ||
    item.token?.symbol ||
    "NFT";
  const metaImage = item.metadata?.image;
  const image =
    (isHttp(item.image_url) && item.image_url) ||
    (isHttp(item.media_url) && item.media_url) ||
    (isHttp(metaImage) && metaImage) ||
    null;
  return {
    title: title.slice(0, 120),
    description: item.metadata?.description?.slice(0, 400) || null,
    url: contract ? marketplaceUrl(opensea, contract, tokenId) : "",
    image_url: image || null,
    chain: chainName,
    collection_name: item.token?.name || null,
    token_id: tokenId,
    acquired_at: null,
    contract,
  };
}

export async function loadWalletNfts(rawAddress: string): Promise<WalletNft[]> {
  const address = rawAddress.trim().toLowerCase();
  if (!isAddress(address)) return [];

  const pages = await Promise.all(
    NFT_CHAINS.map(async (chain) => {
      const items = await getPagedItems<BlockscoutNft>(
        `${chain.host}/api/v2/addresses/${address}/nft?type=ERC-721,ERC-1155`,
        8
      );
      return items.map((item) => mapNft(item, chain.name, chain.opensea)).filter((n): n is WalletNft => !!n);
    })
  );

  const seen = new Set<string>();
  const out: WalletNft[] = [];
  for (const nft of pages.flat()) {
    const key = `${nft.chain}|${nft.contract}|${nft.token_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(nft);
    if (out.length >= 200) break;
  }
  return out;
}

export async function lookupWalletNfts(
  rawAddress: string,
  rawContract: string,
  rawTokenId?: string | null
): Promise<WalletNft[]> {
  const address = rawAddress.trim().toLowerCase();
  const contract = rawContract.trim().toLowerCase();
  const tokenId = (rawTokenId || "").trim();
  if (!isAddress(address) || !isAddress(contract)) return [];

  const pages = await Promise.all(
    NFT_CHAINS.map(async (chain) => {
      if (tokenId) {
        const item = (await getJson(`${chain.host}/api/v2/tokens/${contract}/instances/${tokenId}`)) as BlockscoutNft | null;
        if (!item) return [];
        const owner = (item.owner?.hash || "").toLowerCase();
        if (owner && owner !== address) return [];
        const mapped = mapNft(
          { ...item, id: item.id || tokenId, token: item.token || { address_hash: contract } },
          chain.name,
          chain.opensea
        );
        return mapped ? [mapped] : [];
      }

      const items = await getPagedItems<BlockscoutNft>(
        `${chain.host}/api/v2/tokens/${contract}/instances?holder_address_hash=${address}`,
        6
      );
      return items
        .map((item) => mapNft({ ...item, token: item.token || { address_hash: contract } }, chain.name, chain.opensea))
        .filter((n): n is WalletNft => !!n);
    })
  );

  return pages.flat();
}
