import { lookupWalletNfts } from "@/lib/nfts";
import { fetchNftArtwork } from "@/lib/nft-art";
import { parseNftQuery } from "@/lib/nft-url";
import { gatewayUrls, resolveMediaUrl } from "@/lib/nft-media";
import { getJson, isAddress } from "@/lib/onchain";

export type NftImportResult = {
  verified: boolean;
  name: string;
  collection: string | null;
  chain: string;
  contractAddress: string;
  tokenId: string;
  image: string | null;
  imageCandidates: string[];
  description: string | null;
  attributes: unknown[];
  marketplaceUrl: string;
  owner: string | null;
  error?: string;
};

const RESERVOIR_CHAINS: Record<string, string> = {
  ethereum: "https://api.reservoir.tools",
  base: "https://api-base.reservoir.tools",
  polygon: "https://api-polygon.reservoir.tools",
  arbitrum: "https://api-arbitrum.reservoir.tools",
  optimism: "https://api-optimism.reservoir.tools",
  bsc: "https://api-bsc.reservoir.tools",
};

function reservoirHost(chain: string | null) {
  if (!chain) return RESERVOIR_CHAINS.ethereum;
  return RESERVOIR_CHAINS[chain] || RESERVOIR_CHAINS.ethereum;
}

async function fromReservoir(contract: string, tokenId: string, chain: string | null) {
  const host = reservoirHost(chain);
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
          collection?: { name?: string };
          attributes?: unknown[];
          owner?: string;
        };
      }>;
    };
    const token = json.tokens?.[0]?.token;
    if (!token) return null;
    return {
      name: token.name || null,
      description: token.description || null,
      image: resolveMediaUrl(token.imageSmall || token.image),
      collection: token.collection?.name || null,
      attributes: token.attributes || [],
      owner: token.owner || null,
    };
  } catch {
    return null;
  }
}

async function fromAlchemy(contract: string, tokenId: string, chain: string | null) {
  const key = process.env.ALCHEMY_API_KEY;
  if (!key) return null;
  const net =
    chain === "base"
      ? "base-mainnet"
      : chain === "polygon"
        ? "polygon-mainnet"
        : chain === "arbitrum"
          ? "arb-mainnet"
          : chain === "optimism"
            ? "opt-mainnet"
            : "eth-mainnet";
  const url = `https://${net}.g.alchemy.com/nft/v3/${key}/getNFTMetadata?contractAddress=${contract}&tokenId=${tokenId}`;
  const json = (await getJson(url)) as {
    name?: string;
    description?: string;
    image?: { cachedUrl?: string; thumbnailUrl?: string; originalUrl?: string };
    raw?: { metadata?: { image?: string } };
    contract?: { name?: string };
  } | null;
  if (!json) return null;
  return {
    name: json.name || null,
    description: json.description || null,
    image: resolveMediaUrl(json.image?.cachedUrl || json.image?.thumbnailUrl || json.image?.originalUrl || json.raw?.metadata?.image),
    collection: json.contract?.name || null,
    attributes: [],
    owner: null as string | null,
  };
}

export async function importNftFromInput(input: {
  url: string;
  walletAddress: string;
}): Promise<NftImportResult> {
  const parsed = parseNftQuery(input.url);
  if ("error" in parsed) {
    return emptyResult(input.walletAddress, parsed.error);
  }
  if (!isAddress(input.walletAddress)) {
    return emptyResult(input.walletAddress, "Connect a wallet first.");
  }
  if (!parsed.tokenId) {
    const held = await lookupWalletNfts(input.walletAddress, parsed.contract);
    if (!held.length) {
      return {
        ...emptyResult(input.walletAddress, "This wallet does not currently hold that contract."),
        contractAddress: parsed.contract,
        verified: false,
      };
    }
    const first = held[0];
    return {
      verified: true,
      name: first.title,
      collection: first.collection_name,
      chain: first.chain,
      contractAddress: first.contract,
      tokenId: first.token_id,
      image: first.image_url,
      imageCandidates: gatewayUrls(first.image_url),
      description: first.description,
      attributes: [],
      marketplaceUrl: first.url,
      owner: input.walletAddress,
    };
  }

  const [owned, reservoir, alchemy, art] = await Promise.all([
    lookupWalletNfts(input.walletAddress, parsed.contract, parsed.tokenId),
    fromReservoir(parsed.contract, parsed.tokenId, parsed.chain),
    fromAlchemy(parsed.contract, parsed.tokenId, parsed.chain),
    fetchNftArtwork(parsed.contract, parsed.tokenId, parsed.chainHint),
  ]);

  const held = owned[0] || null;
  const image =
    held?.image_url ||
    reservoir?.image ||
    alchemy?.image ||
    art?.image_url ||
    null;
  const candidates = gatewayUrls(image);
  const verified = !!held;

  return {
    verified,
    name:
      held?.title ||
      reservoir?.name ||
      alchemy?.name ||
      art?.title ||
      `NFT #${parsed.tokenId}`,
    collection:
      held?.collection_name ||
      reservoir?.collection ||
      alchemy?.collection ||
      art?.collection_name ||
      null,
    chain: held?.chain || art?.chain || (parsed.chain ? titleCase(parsed.chain) : "Unknown"),
    contractAddress: parsed.contract,
    tokenId: parsed.tokenId,
    image,
    imageCandidates: candidates,
    description: held?.description || reservoir?.description || alchemy?.description || null,
    attributes: reservoir?.attributes || [],
    marketplaceUrl:
      held?.url ||
      art?.url ||
      `https://opensea.io/item/${parsed.chain === "polygon" ? "polygon" : parsed.chain || "ethereum"}/${parsed.contract}/${parsed.tokenId}`,
    owner: held ? input.walletAddress : reservoir?.owner || null,
    error: verified ? undefined : "This wallet does not currently hold this NFT.",
  };
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function emptyResult(wallet: string, error: string): NftImportResult {
  return {
    verified: false,
    name: "",
    collection: null,
    chain: "",
    contractAddress: "",
    tokenId: "",
    image: null,
    imageCandidates: [],
    description: null,
    attributes: [],
    marketplaceUrl: "",
    owner: wallet || null,
    error,
  };
}
