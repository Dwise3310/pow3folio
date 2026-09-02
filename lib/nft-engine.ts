import { getJson, isAddress } from "@/lib/onchain";
import { lookupWalletNfts } from "@/lib/nfts";
import { fetchNftArtwork } from "@/lib/nft-art";
import { parseNftQuery } from "@/lib/nft-url";
import {
  classifyByHint,
  gatewayUrls,
  isTrustedMediaHost,
  resolveMediaUrl,
  type NftMediaAsset,
  type NftMediaFailure,
  type NftMediaKind,
  type NftMediaManifest,
} from "@/lib/nft-media";
import { metadataFetchCandidates, readOnchainMetadataUri, tokenIdPresent } from "@/lib/nft-onchain-uri";

export type ResolvedNft = {
  verified: boolean;
  name: string;
  collection: string | null;
  chain: string;
  contractAddress: string;
  tokenId: string;
  standard: "ERC721" | "ERC1155" | "unknown";
  description: string | null;
  attributes: unknown[];
  marketplaceUrl: string;
  owner: string | null;
  image: string | null;
  imageCandidates: string[];
  media: NftMediaManifest;
  tokenUri: string | null;
  error?: string;
  failure?: NftMediaFailure | null;
};

const cache = new Map<string, { at: number; value: ResolvedNft }>();
const CACHE_MS = 10 * 60 * 1000;

const ALCHEMY_NET: Record<string, string> = {
  ethereum: "eth-mainnet",
  polygon: "polygon-mainnet",
  base: "base-mainnet",
  arbitrum: "arb-mainnet",
  optimism: "opt-mainnet",
  bsc: "bnb-mainnet",
};

const RESERVOIR_HOST: Record<string, string> = {
  ethereum: "https://api.reservoir.tools",
  base: "https://api-base.reservoir.tools",
  polygon: "https://api-polygon.reservoir.tools",
  arbitrum: "https://api-arbitrum.reservoir.tools",
  optimism: "https://api-optimism.reservoir.tools",
  bsc: "https://api-bsc.reservoir.tools",
};

function cacheKey(chain: string, contract: string, tokenId: string) {
  return `${(chain || "").toLowerCase()}|${contract.toLowerCase()}|${tokenId}`;
}

function titleCase(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function normalizeChainKey(chain: string | null | undefined) {
  const key = (chain || "").toLowerCase();
  if (key.includes("polygon") || key === "matic") return "polygon";
  if (key.includes("base")) return "base";
  if (key.includes("arb")) return "arbitrum";
  if (key.includes("op")) return "optimism";
  if (key.includes("bsc") || key.includes("bnb")) return "bsc";
  if (key.includes("eth")) return "ethereum";
  return key || null;
}

function asset(url: string | null | undefined, source: string, original?: string | null, typeHint?: string | null): NftMediaAsset | null {
  const resolved = resolveMediaUrl(url);
  if (!resolved) return null;
  const type: NftMediaKind = classifyByHint(resolved, typeHint);
  return {
    type: type === "unknown" && isTrustedMediaHost(resolved) ? "image" : type,
    url: resolved,
    originalUrl: original || url || resolved,
    contentType: typeHint || undefined,
    source,
  };
}

function pickBest(assets: Array<NftMediaAsset | null>): NftMediaAsset | null {
  const list = assets.filter((a): a is NftMediaAsset => !!a);
  if (!list.length) return null;
  return (
    list.find((a) => a.source.startsWith("alchemy") && isTrustedMediaHost(a.url)) ||
    list.find((a) => a.source.startsWith("reservoir") && isTrustedMediaHost(a.url)) ||
    list.find((a) => a.source.startsWith("opensea") && isTrustedMediaHost(a.url)) ||
    list.find((a) => isTrustedMediaHost(a.url)) ||
    list.find((a) => a.type === "video" || a.type === "gif") ||
    list[0]
  );
}

async function fetchJsonFromUri(uri: string): Promise<Record<string, unknown> | null> {
  if (uri.startsWith("data:application/json")) {
    const comma = uri.indexOf(",");
    if (comma < 0) return null;
    const payload = uri.slice(comma + 1);
    try {
      const decoded = uri.includes(";base64")
        ? typeof atob === "function"
          ? atob(payload)
          : decodeURIComponent(payload)
        : decodeURIComponent(payload);
      return JSON.parse(decoded) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  for (const url of metadataFetchCandidates(uri).slice(0, 5)) {
    const json = await getJson(url, 8000);
    if (json && typeof json === "object") return json as Record<string, unknown>;
  }
  return null;
}

function harvestMetadataMedia(meta: Record<string, unknown> | null, source: string) {
  if (!meta) return { images: [] as NftMediaAsset[], animation: null as NftMediaAsset | null };
  const imageFields = [
    meta.image,
    meta.image_url,
    meta.imageUrl,
    meta.image_preview_url,
    meta.image_thumbnail_url,
    meta.image_original_url,
    meta.image_data,
  ];
  const images = imageFields
    .map((value, i) => (typeof value === "string" ? asset(value, `${source}:image:${i}`) : null))
    .filter((a): a is NftMediaAsset => !!a);
  const animRaw = meta.animation_url || meta.animation_original_url || meta.animation;
  const animation = typeof animRaw === "string" ? asset(animRaw, `${source}:animation`) : null;
  return { images, animation };
}

async function fromAlchemy(contract: string, tokenId: string, chain: string | null) {
  const key = process.env.ALCHEMY_API_KEY || "demo";
  const net = ALCHEMY_NET[normalizeChainKey(chain) || "ethereum"] || "eth-mainnet";
  const url = `https://${net}.g.alchemy.com/nft/v3/${key}/getNFTMetadata?contractAddress=${contract}&tokenId=${encodeURIComponent(tokenId)}`;
  const json = (await getJson(url, 10000)) as {
    name?: string;
    description?: string;
    tokenUri?: string;
    image?: { cachedUrl?: string; thumbnailUrl?: string; pngUrl?: string; originalUrl?: string; contentType?: string };
    animation?: { cachedUrl?: string; originalUrl?: string; orginalUrl?: string; contentType?: string };
    raw?: { metadata?: Record<string, unknown>; tokenUri?: string };
    contract?: { name?: string; tokenType?: string };
  } | null;
  if (!json) return null;
  const images = [
    asset(json.image?.cachedUrl, "alchemy:cached", json.image?.originalUrl, json.image?.contentType),
    asset(json.image?.pngUrl, "alchemy:png", json.image?.originalUrl, "image/png"),
    asset(json.image?.thumbnailUrl, "alchemy:thumb", json.image?.originalUrl),
    asset(json.image?.originalUrl, "alchemy:original"),
  ].filter((a): a is NftMediaAsset => !!a);
  const harvested = harvestMetadataMedia(json.raw?.metadata || null, "alchemy-raw");
  const animation =
    asset(
      json.animation?.cachedUrl || json.animation?.originalUrl || json.animation?.orginalUrl,
      "alchemy:animation",
      json.animation?.originalUrl || json.animation?.orginalUrl,
      json.animation?.contentType
    ) || harvested.animation;
  return {
    name: json.name || (typeof json.raw?.metadata?.name === "string" ? json.raw.metadata.name : null),
    description: json.description || null,
    collection: json.contract?.name || null,
    tokenUri: json.tokenUri || json.raw?.tokenUri || null,
    standard: (json.contract?.tokenType || "").toUpperCase().includes("1155") ? ("ERC1155" as const) : ("ERC721" as const),
    images: [...images, ...harvested.images],
    animation,
  };
}

async function fromReservoir(contract: string, tokenId: string, chain: string | null) {
  const host = RESERVOIR_HOST[normalizeChainKey(chain) || "ethereum"] || RESERVOIR_HOST.ethereum;
  const key = process.env.RESERVOIR_API_KEY;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (key) headers["x-api-key"] = key;
  try {
    const res = await fetch(`${host}/tokens/v6?tokens=${contract}:${tokenId}`, { headers });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      tokens?: Array<{
        token?: {
          name?: string;
          description?: string;
          image?: string;
          imageSmall?: string;
          media?: string;
          collection?: { name?: string };
          attributes?: unknown[];
          owner?: string;
          tokenUri?: string;
        };
      }>;
    };
    const token = json.tokens?.[0]?.token;
    if (!token) return null;
    return {
      name: token.name || null,
      description: token.description || null,
      collection: token.collection?.name || null,
      owner: token.owner || null,
      attributes: token.attributes || [],
      tokenUri: token.tokenUri || null,
      images: [asset(token.imageSmall, "reservoir:small"), asset(token.image, "reservoir:image"), asset(token.media, "reservoir:media")].filter(
        (a): a is NftMediaAsset => !!a
      ),
      animation: token.media && classifyByHint(token.media) === "video" ? asset(token.media, "reservoir:animation") : null,
    };
  } catch {
    return null;
  }
}

async function fromOpenSea(contract: string, tokenId: string, chain: string | null) {
  const key = process.env.OPENSEA_API_KEY;
  const slug = normalizeChainKey(chain) === "polygon" ? "matic" : normalizeChainKey(chain) || "ethereum";
  const headers: Record<string, string> = { Accept: "application/json" };
  if (key) headers["x-api-key"] = key;
  try {
    const res = await fetch(
      `https://api.opensea.io/api/v2/chain/${slug}/contract/${contract}/nfts/${encodeURIComponent(tokenId)}`,
      { headers }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      nft?: {
        name?: string;
        description?: string;
        image_url?: string;
        animation_url?: string;
        display_image_url?: string;
        opensea_url?: string;
        collection?: string;
        metadata_url?: string;
      };
    };
    const nft = json.nft;
    if (!nft) return null;
    return {
      name: nft.name || null,
      description: nft.description || null,
      collection: nft.collection || null,
      url: nft.opensea_url || null,
      tokenUri: nft.metadata_url || null,
      images: [asset(nft.display_image_url, "opensea:display"), asset(nft.image_url, "opensea:image")].filter((a): a is NftMediaAsset => !!a),
      animation: asset(nft.animation_url, "opensea:animation"),
    };
  } catch {
    return null;
  }
}

function emptyResolved(error: string, extras?: Partial<ResolvedNft>): ResolvedNft {
  return {
    verified: false,
    name: "",
    collection: null,
    chain: "",
    contractAddress: "",
    tokenId: "",
    standard: "unknown",
    description: null,
    attributes: [],
    marketplaceUrl: "",
    owner: null,
    image: null,
    imageCandidates: [],
    media: { primary: null, animation: null, posterUrl: null, failure: extras?.failure || "METADATA_NOT_FOUND" },
    tokenUri: null,
    error,
    failure: extras?.failure || "METADATA_NOT_FOUND",
    ...extras,
  };
}

export async function resolveNftMedia(input: {
  url?: string;
  contract?: string;
  tokenId?: string;
  chain?: string | null;
  walletAddress?: string | null;
  verifyOwnership?: boolean;
}): Promise<ResolvedNft> {
  const parsed = input.url
    ? parseNftQuery(input.url)
    : input.contract
      ? {
          marketplace: "direct",
          chain: normalizeChainKey(input.chain),
          chainHint: input.chain || null,
          contract: input.contract.toLowerCase(),
          tokenId: tokenIdPresent(input.tokenId) ? String(input.tokenId) : "",
          sourceUrl: "",
        }
      : { error: "Paste an NFT URL or contract address." };

  if ("error" in parsed) return emptyResolved(parsed.error);

  const contract = parsed.contract.toLowerCase();
  const tokenId = tokenIdPresent(parsed.tokenId) ? String(parsed.tokenId) : "";
  const chainKey = normalizeChainKey(parsed.chain || input.chain);
  const wallet = (input.walletAddress || "").trim();

  if (!isAddress(contract)) return emptyResolved("Could not find a contract address in that link.");

  if (tokenId === "") {
    if (!wallet || !isAddress(wallet)) {
      return emptyResolved("Connect a wallet first.", { failure: "OWNERSHIP_FAILED", contractAddress: contract });
    }
    const held = await lookupWalletNfts(wallet, contract);
    if (!held.length) {
      return emptyResolved("This wallet does not currently hold that contract.", {
        failure: "OWNERSHIP_FAILED",
        contractAddress: contract,
        chain: chainKey ? titleCase(chainKey) : "",
      });
    }
    return resolveNftMedia({
      contract,
      tokenId: held[0].token_id,
      chain: held[0].chain || chainKey,
      walletAddress: wallet,
      verifyOwnership: true,
    });
  }

  const key = cacheKey(chainKey || "", contract, tokenId);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS && (!input.verifyOwnership || hit.value.verified)) {
    return hit.value;
  }

  const [owned, alchemy, reservoir, opensea, onchain, art] = await Promise.all([
    wallet && isAddress(wallet) ? lookupWalletNfts(wallet, contract, tokenId) : Promise.resolve([]),
    fromAlchemy(contract, tokenId, chainKey),
    fromReservoir(contract, tokenId, chainKey),
    fromOpenSea(contract, tokenId, chainKey),
    readOnchainMetadataUri({ contract, tokenId, chain: chainKey }),
    fetchNftArtwork(contract, tokenId, parsed.chainHint || chainKey),
  ]);

  let onchainMeta: Record<string, unknown> | null = null;
  if (onchain.uri) onchainMeta = await fetchJsonFromUri(onchain.uri);
  const harvested = harvestMetadataMedia(onchainMeta, "onchain");

  const images = [
    ...(alchemy?.images || []),
    ...(reservoir?.images || []),
    ...(opensea?.images || []),
    ...harvested.images,
    asset(art?.image_url, "blockscout"),
    asset(owned[0]?.image_url, "wallet"),
  ];
  const animation = alchemy?.animation || reservoir?.animation || opensea?.animation || harvested.animation || null;
  const primaryFromAnim =
    animation && (animation.type === "video" || animation.type === "gif" || animation.type === "html") ? animation : null;
  const primary = primaryFromAnim || pickBest(images) || animation;
  const poster = pickBest(images);

  let failure: NftMediaFailure | null = null;
  if (!primary) {
    failure = onchain.uri || alchemy || reservoir || art ? "MEDIA_NOT_FOUND" : "METADATA_NOT_FOUND";
  }

  const verified = owned.length > 0;
  const chainName =
    owned[0]?.chain || art?.chain || (chainKey ? titleCase(chainKey === "bsc" ? "BNB Chain" : chainKey) : "Unknown");
  const marketplaceUrl =
    owned[0]?.url ||
    opensea?.url ||
    art?.url ||
    `https://opensea.io/item/${chainKey === "polygon" ? "polygon" : chainKey || "ethereum"}/${contract}/${tokenId}`;

  const imageUrl = primary?.url || poster?.url || null;
  const result: ResolvedNft = {
    verified,
    name:
      (typeof onchainMeta?.name === "string" && onchainMeta.name) ||
      owned[0]?.title ||
      alchemy?.name ||
      reservoir?.name ||
      opensea?.name ||
      art?.title ||
      `NFT #${tokenId}`,
    collection:
      owned[0]?.collection_name || alchemy?.collection || reservoir?.collection || opensea?.collection || art?.collection_name || null,
    chain: chainName,
    contractAddress: contract,
    tokenId,
    standard: onchain.standard !== "unknown" ? onchain.standard : alchemy?.standard || "unknown",
    description:
      (typeof onchainMeta?.description === "string" && onchainMeta.description) ||
      owned[0]?.description ||
      alchemy?.description ||
      reservoir?.description ||
      opensea?.description ||
      null,
    attributes: reservoir?.attributes || (Array.isArray(onchainMeta?.attributes) ? onchainMeta.attributes : []),
    marketplaceUrl,
    owner: verified ? wallet : reservoir?.owner || null,
    image: imageUrl,
    imageCandidates: [
      ...new Set([imageUrl, poster?.url, ...(imageUrl ? gatewayUrls(primary?.originalUrl || imageUrl) : [])].filter(Boolean) as string[]),
    ],
    media: { primary, animation, posterUrl: poster?.url || null, failure },
    tokenUri: onchain.uri || alchemy?.tokenUri || reservoir?.tokenUri || opensea?.tokenUri || null,
    error: input.verifyOwnership !== false && wallet && !verified ? "This wallet does not currently hold this NFT." : undefined,
    failure,
  };

  cache.set(key, { at: Date.now(), value: result });
  return result;
}
