export type ParsedNftRef = {
  marketplace: string;
  chain: string | null;
  chainHint: string | null;
  contract: string;
  tokenId: string;
  sourceUrl: string;
};

const CHAIN_ALIASES: Record<string, string> = {
  eth: "ethereum",
  ethereum: "ethereum",
  mainnet: "ethereum",
  base: "base",
  arb: "arbitrum",
  arbitrum: "arbitrum",
  op: "optimism",
  optimism: "optimism",
  matic: "polygon",
  polygon: "polygon",
  pol: "polygon",
  bsc: "bsc",
  bnb: "bsc",
  "binance-smart-chain": "bsc",
  avalanche: "avalanche",
  avax: "avalanche",
  zora: "zora",
  blast: "blast",
  linea: "linea",
  scroll: "scroll",
  sei: "sei",
  abstract: "abstract",
  apechain: "apechain",
  berachain: "berachain",
};

function isAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function normalizeChain(raw: string | null | undefined) {
  if (!raw) return null;
  const key = raw.toLowerCase().replace(/\s+/g, "-");
  return CHAIN_ALIASES[key] || key;
}

export function parseNftQuery(rawInput: string): ParsedNftRef | { error: string } {
  const raw = rawInput.trim();
  if (!raw) return { error: "Paste an NFT URL or contract address." };

  const contractMatch = raw.match(/0x[a-fA-F0-9]{40}/);
  const contract = contractMatch ? contractMatch[0].toLowerCase() : "";

  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    const host = url.hostname.replace(/^www\./, "");
    const parts = url.pathname.split("/").filter(Boolean);

    if (host.includes("opensea.io")) {
      const assetsIdx = parts.findIndex((p) => p === "item" || p === "assets");
      if (assetsIdx >= 0 && parts[assetsIdx + 1] && parts[assetsIdx + 2]) {
        const chain = normalizeChain(parts[assetsIdx + 1]);
        const ca = parts[assetsIdx + 2];
        const tokenId = decodeURIComponent(parts[assetsIdx + 3] || "");
        if (isAddress(ca) && tokenId) {
          return {
            marketplace: "opensea",
            chain,
            chainHint: chain,
            contract: ca.toLowerCase(),
            tokenId,
            sourceUrl: url.toString(),
          };
        }
      }
    }

    if (host.includes("magiceden.io") || host.includes("magiceden.us")) {
      const itemIdx = parts.findIndex((p) => p === "item-details" || p === "item");
      if (itemIdx >= 0) {
        const maybeChain = normalizeChain(parts[itemIdx + 1]);
        const ca = parts[itemIdx + 2] || parts[itemIdx + 1];
        const tokenId = decodeURIComponent(parts[itemIdx + 3] || parts[itemIdx + 2] || "");
        if (isAddress(ca) && tokenId && !isAddress(tokenId)) {
          return {
            marketplace: "magiceden",
            chain: maybeChain && !isAddress(parts[itemIdx + 1]) ? maybeChain : null,
            chainHint: maybeChain,
            contract: ca.toLowerCase(),
            tokenId,
            sourceUrl: url.toString(),
          };
        }
      }
    }

    if (host.includes("tensor.trade") || host.includes("tensor.exchange")) {
      const itemIdx = parts.findIndex((p) => p === "item");
      if (itemIdx >= 0 && isAddress(parts[itemIdx + 1] || "")) {
        return {
          marketplace: "tensor",
          chain: "solana",
          chainHint: "solana",
          contract: parts[itemIdx + 1].toLowerCase(),
          tokenId: decodeURIComponent(parts[itemIdx + 2] || ""),
          sourceUrl: url.toString(),
        };
      }
    }

    if (host.includes("blur.io")) {
      const assetIdx = parts.findIndex((p) => p === "asset" || p === "collection");
      if (assetIdx >= 0 && isAddress(parts[assetIdx + 1] || "")) {
        return {
          marketplace: "blur",
          chain: "ethereum",
          chainHint: "ethereum",
          contract: parts[assetIdx + 1].toLowerCase(),
          tokenId: decodeURIComponent(parts[assetIdx + 2] || ""),
          sourceUrl: url.toString(),
        };
      }
    }

    if (host.includes("rarible.com")) {
      const token = parts.find((p) => p.includes(":"));
      if (token) {
        const [ca, id] = token.split(":");
        if (isAddress(ca) && id) {
          return {
            marketplace: "rarible",
            chain: normalizeChain(parts[0]),
            chainHint: parts[0],
            contract: ca.toLowerCase(),
            tokenId: id,
            sourceUrl: url.toString(),
          };
        }
      }
    }
  } catch {
    /* not a URL */
  }

  if (!contract) return { error: "Could not find a contract address in that link." };

  const after = raw.slice(raw.toLowerCase().indexOf(contract) + 42);
  const idMatch =
    after.match(/(?:[/#]|token[_-]?id=)([^\s/?#]+)/i) ||
    raw.match(/token[_-]?id=([^\s&]+)/i) ||
    after.match(/(\d{1,78})/);

  return {
    marketplace: "direct",
    chain: null,
    chainHint: null,
    contract,
    tokenId: idMatch ? decodeURIComponent(idMatch[1]) : "",
    sourceUrl: raw,
  };
}
