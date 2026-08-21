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

export function resolveMediaUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = String(raw).trim().replace(/^"|"$/g, "");
  if (!value) return null;
  if (/^ipfs:\/\//i.test(value)) {
    const path = value.replace(/^ipfs:\/\//i, "").replace(/^ipfs\//i, "");
    return `https://ipfs.io/ipfs/${path}`;
  }
  if (value.startsWith("ar://")) return `https://arweave.net/${value.slice(5)}`;
  if (/^(Qm[1-9A-HJ-NP-Za-km-z]{44,}|bafy[a-z0-9]+)/i.test(value)) {
    return `https://ipfs.io/ipfs/${value}`;
  }
  if (/^https?:\/\//i.test(value)) return value;
  return null;
}

function imageFromUnknown(value: unknown): string | null {
  if (typeof value === "string") return resolveMediaUrl(value);
  if (Array.isArray(value) && value.length) return imageFromUnknown(value[0]);
  if (value && typeof value === "object") {
    const rec = value as Record<string, unknown>;
    return (
      resolveMediaUrl(typeof rec.url === "string" ? rec.url : null) ||
      resolveMediaUrl(typeof rec.gateway === "string" ? rec.gateway : null) ||
      resolveMediaUrl(typeof rec.src === "string" ? rec.src : null)
    );
  }
  return null;
}

function parseMetadata(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("{")) {
      try {
        return JSON.parse(trimmed) as Record<string, unknown>;
      } catch {
        return { image: trimmed };
      }
    }
    return { image: trimmed };
  }
  if (typeof raw === "object") return raw as Record<string, unknown>;
  return null;
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
  animation_url?: string | null;
  external_app_url?: string | null;
  metadata?: unknown;
  token?: { address_hash?: string; name?: string; symbol?: string; icon_url?: string | null };
  owner?: { hash?: string };
  thumbnails?: { url?: string | null } | null;
};

function marketplaceUrl(openseaChain: string, contract: string, tokenId: string) {
  return `https://opensea.io/item/${openseaChain === "matic" ? "polygon" : openseaChain}/${contract}/${tokenId}`;
}

function pickImage(item: BlockscoutNft): string | null {
  const meta = parseMetadata(item.metadata);
  return (
    resolveMediaUrl(item.image_url) ||
    resolveMediaUrl(item.media_url) ||
    imageFromUnknown(meta?.image) ||
    imageFromUnknown(meta?.image_url) ||
    imageFromUnknown(meta?.imageUrl) ||
    imageFromUnknown(meta?.animation_url) ||
    resolveMediaUrl(item.token?.icon_url) ||
    resolveMediaUrl(item.thumbnails?.url) ||
    resolveMediaUrl(item.animation_url) ||
    resolveMediaUrl(item.external_app_url)
  );
}

function mapNft(item: BlockscoutNft, chainName: string, opensea: string): WalletNft | null {
  const tokenId = String(item.id || "").trim();
  const contract = (item.token?.address_hash || "").toLowerCase();
  if (!tokenId) return null;
  const meta = parseMetadata(item.metadata);
  const metaName = typeof meta?.name === "string" ? meta.name.trim() : "";
  const metaDesc = typeof meta?.description === "string" ? meta.description : "";
  const title =
    metaName ||
    (item.token?.name && tokenId ? `${item.token.name} #${tokenId.slice(0, 10)}` : null) ||
    item.token?.symbol ||
    "NFT";
  return {
    title: title.slice(0, 120),
    description: metaDesc.slice(0, 400) || null,
    url: contract ? marketplaceUrl(opensea, contract, tokenId) : "",
    image_url: pickImage(item),
    chain: chainName,
    collection_name: item.token?.name || null,
    token_id: tokenId,
    acquired_at: null,
    contract,
  };
}

async function hydrateNft(
  item: BlockscoutNft,
  chainName: string,
  opensea: string,
  host: string,
  fallbackContract?: string
): Promise<WalletNft | null> {
  const withToken: BlockscoutNft = {
    ...item,
    token: item.token || (fallbackContract ? { address_hash: fallbackContract } : item.token),
  };
  const mapped = mapNft(withToken, chainName, opensea);
  if (!mapped) return null;
  if (mapped.image_url) return mapped;

  const contract = mapped.contract || fallbackContract || "";
  if (!contract || !mapped.token_id) return mapped;

  const fresh = (await getJson(`${host}/api/v2/tokens/${contract}/instances/${mapped.token_id}`)) as BlockscoutNft | null;
  if (!fresh) return mapped;
  const richer = mapNft(
    { ...fresh, id: fresh.id || mapped.token_id, token: fresh.token || { address_hash: contract } },
    chainName,
    opensea
  );
  if (!richer) return mapped;
  return {
    ...mapped,
    title: richer.title || mapped.title,
    description: richer.description || mapped.description,
    image_url: richer.image_url || mapped.image_url,
    url: richer.url || mapped.url,
    collection_name: richer.collection_name || mapped.collection_name,
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
      const mapped = await Promise.all(
        items.slice(0, 80).map((item) => hydrateNft(item, chain.name, chain.opensea, chain.host))
      );
      return mapped.filter((n): n is WalletNft => !!n);
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
        const mapped = await hydrateNft(
          { ...item, id: item.id || tokenId, token: item.token || { address_hash: contract } },
          chain.name,
          chain.opensea,
          chain.host,
          contract
        );
        return mapped ? [mapped] : [];
      }

      const items = await getPagedItems<BlockscoutNft>(
        `${chain.host}/api/v2/tokens/${contract}/instances?holder_address_hash=${address}`,
        6
      );
      const mapped = await Promise.all(
        items.map((item) =>
          hydrateNft({ ...item, token: item.token || { address_hash: contract } }, chain.name, chain.opensea, chain.host, contract)
        )
      );
      return mapped.filter((n): n is WalletNft => !!n);
    })
  );

  return pages.flat();
}
