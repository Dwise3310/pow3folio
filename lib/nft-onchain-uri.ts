import { rpcCall } from "@/lib/chain-rpc";
import { extractCid } from "@/lib/nft-media";

const TOKEN_URI = "c87b56dd";
const ERC1155_URI = "0e89341c";
const SUPPORTS_INTERFACE = "01ffc9a7";
const ERC721_IFACE = "80ac58cd";
const ERC1155_IFACE = "d9b67a26";

const CHAIN_RPCS: Record<string, string[]> = {
  ethereum: ["https://ethereum.publicnode.com", "https://rpc.ankr.com/eth"],
  polygon: ["https://polygon.gateway.tenderly.co", "https://rpc-mainnet.matic.quiknode.pro"],
  base: ["https://mainnet.base.org", "https://base.gateway.tenderly.co"],
  arbitrum: ["https://arb1.arbitrum.io/rpc", "https://arbitrum.gateway.tenderly.co"],
  optimism: ["https://mainnet.optimism.io"],
  bsc: ["https://bsc-dataseed.binance.org"],
};

function normalizeChain(chain: string | null | undefined) {
  const key = (chain || "").toLowerCase();
  if (key.includes("polygon") || key === "matic") return "polygon";
  if (key.includes("base")) return "base";
  if (key.includes("arb")) return "arbitrum";
  if (key.includes("op")) return "optimism";
  if (key.includes("bsc") || key.includes("bnb")) return "bsc";
  if (key.includes("eth")) return "ethereum";
  return key || "ethereum";
}

export function tokenIdPresent(tokenId: string | number | null | undefined): boolean {
  return tokenId !== null && tokenId !== undefined && String(tokenId).trim() !== "";
}

export function normalizeTokenId(tokenId: string | number): string {
  return String(tokenId).trim();
}

export function tokenIdToHexWord(tokenId: string): string {
  const raw = String(tokenId).trim();
  if (raw.startsWith("0x") || raw.startsWith("0X")) {
    return raw.slice(2).toLowerCase().padStart(64, "0");
  }
  try {
    return BigInt(raw).toString(16).padStart(64, "0");
  } catch {
    return raw.padStart(64, "0");
  }
}

export function substituteErc1155Id(uri: string, tokenId: string): string {
  if (!uri.includes("{id}")) return uri;
  return uri.replace(/\{id\}/gi, tokenIdToHexWord(tokenId));
}

function decodeAbiString(hex: string): string | null {
  const raw = hex.replace(/^0x/, "");
  if (raw.length < 128) return null;
  try {
    const offset = parseInt(raw.slice(0, 64), 16);
    const start = offset * 2;
    const len = parseInt(raw.slice(start, start + 64), 16);
    if (!Number.isFinite(len) || len <= 0 || len > 2048) return null;
    const data = raw.slice(start + 64, start + 64 + len * 2);
    const bytes = data.match(/.{2}/g) || [];
    return bytes.map((b) => String.fromCharCode(parseInt(b, 16))).join("").replace(/\u0000/g, "").trim();
  } catch {
    return null;
  }
}

function alchemyRpc(chain: string): string | null {
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
            : chain === "bsc"
              ? "bnb-mainnet"
              : "eth-mainnet";
  return `https://${net}.g.alchemy.com/v2/${key}`;
}

function rpcsFor(chain: string): string[] {
  const list = [...(CHAIN_RPCS[chain] || CHAIN_RPCS.ethereum)];
  const alchemy = alchemyRpc(chain);
  if (alchemy) list.unshift(alchemy);
  return list;
}

async function supportsInterface(rpcs: string[], contract: string, iface: string): Promise<boolean> {
  const data = `0x${SUPPORTS_INTERFACE}${iface.padEnd(64, "0")}`;
  const result = await rpcCall(rpcs, "eth_call", [{ to: contract, data }, "latest"]);
  return typeof result === "string" && result.endsWith("1");
}

export async function readOnchainMetadataUri(input: {
  contract: string;
  tokenId: string;
  chain?: string | null;
  standard?: "ERC721" | "ERC1155" | null;
}): Promise<{ uri: string | null; standard: "ERC721" | "ERC1155" | "unknown"; source: string }> {
  const contract = input.contract.toLowerCase();
  const tokenId = normalizeTokenId(input.tokenId);
  if (!tokenIdPresent(tokenId)) {
    return { uri: null, standard: "unknown", source: "onchain" };
  }
  const chain = normalizeChain(input.chain);
  const rpcs = rpcsFor(chain);
  const word = tokenIdToHexWord(tokenId);

  let standard: "ERC721" | "ERC1155" | "unknown" = input.standard || "unknown";
  if (!input.standard) {
    const [is721, is1155] = await Promise.all([
      supportsInterface(rpcs, contract, ERC721_IFACE),
      supportsInterface(rpcs, contract, ERC1155_IFACE),
    ]);
    if (is1155 && !is721) standard = "ERC1155";
    else if (is721) standard = "ERC721";
  }

  const trySelectors =
    standard === "ERC1155" ? [ERC1155_URI, TOKEN_URI] : standard === "ERC721" ? [TOKEN_URI, ERC1155_URI] : [TOKEN_URI, ERC1155_URI];

  for (const sel of trySelectors) {
    const data = `0x${sel}${word}`;
    const result = await rpcCall(rpcs, "eth_call", [{ to: contract, data }, "latest"]);
    if (typeof result !== "string" || result === "0x") continue;
    const decoded = decodeAbiString(result);
    if (!decoded) continue;
    const uri = sel === ERC1155_URI ? substituteErc1155Id(decoded, tokenId) : decoded;
    return {
      uri,
      standard: sel === ERC1155_URI ? "ERC1155" : "ERC721",
      source: "onchain",
    };
  }
  return { uri: null, standard, source: "onchain" };
}

export function metadataFetchCandidates(uri: string): string[] {
  const value = uri.trim();
  if (value.startsWith("data:")) return [value];
  if (value.startsWith("ar://")) return [`https://arweave.net/${value.slice(5)}`];
  const cid = extractCid(value);
  const out: string[] = [];
  if (/^https?:\/\//i.test(value)) out.push(value);
  if (cid) {
    const rest = cid.rest && cid.rest !== "/" ? cid.rest : "";
    out.push(`https://${cid.cid}.ipfs.w3s.link${rest}`);
    out.push(`https://gateway.pinata.cloud/ipfs/${cid.cid}${rest}`);
    out.push(`https://nftstorage.link/ipfs/${cid.cid}${rest}`);
    out.push(`https://4everland.io/ipfs/${cid.cid}${rest}`);
    out.push(`https://dweb.link/ipfs/${cid.cid}${rest}`);
  }
  return [...new Set(out)];
}
