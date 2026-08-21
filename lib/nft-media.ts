export const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://dweb.link/ipfs/",
  "https://nftstorage.link/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
  "https://w3s.link/ipfs/",
] as const;

const CID_RE = /(?:Qm[1-9A-HJ-NP-Za-km-z]{44,}|bafy[a-z0-9]{20,}|bafk[a-z0-9]{20,}|baf[a-z0-9]{20,})/i;

export function extractCid(raw: string | null | undefined): { cid: string; rest: string } | null {
  if (!raw) return null;
  const value = String(raw).trim();
  if (!value) return null;

  const ipfsProto = value.match(/^ipfs:\/\/(?:ipfs\/)?([^/?#]+)(.*)$/i);
  if (ipfsProto) {
    return { cid: ipfsProto[1], rest: ipfsProto[2] || "" };
  }

  const w3s = value.match(/^https?:\/\/([a-z0-9]+)\.ipfs\.w3s\.link(\/.*)?$/i);
  if (w3s) {
    return { cid: w3s[1], rest: w3s[2] || "" };
  }

  const cf = value.match(/^https?:\/\/([a-z0-9]+)\.ipfs\.dweb\.link(\/.*)?$/i);
  if (cf) {
    return { cid: cf[1], rest: cf[2] || "" };
  }

  const path = value.match(/\/ipfs\/([^/?#]+)(.*)$/i);
  if (path) {
    return { cid: path[1], rest: path[2] || "" };
  }

  const cidOnly = value.match(CID_RE);
  if (cidOnly && !/^https?:\/\//i.test(value)) {
    return { cid: cidOnly[0], rest: "" };
  }

  if (cidOnly) {
    const after = value.slice(value.indexOf(cidOnly[0]) + cidOnly[0].length);
    const rest = after.startsWith("/") ? after.replace(/[?#].*$/, "") : "";
    return { cid: cidOnly[0], rest };
  }

  return null;
}

export function resolveMediaUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = String(raw).trim().replace(/^"|"$/g, "");
  if (!value) return null;
  if (value.startsWith("ar://")) return `https://arweave.net/${value.slice(5)}`;
  const cid = extractCid(value);
  if (cid) {
    const rest = cid.rest && cid.rest !== "/" ? cid.rest : "";
    return `${IPFS_GATEWAYS[0]}${cid.cid}${rest}`;
  }
  if (/^https?:\/\//i.test(value)) return value;
  return null;
}

export function gatewayUrls(raw: string | null | undefined): string[] {
  const resolved = resolveMediaUrl(raw);
  if (!resolved) return [];
  const cid = extractCid(raw || resolved);
  if (!cid) return [resolved];
  const rest = cid.rest && cid.rest !== "/" ? cid.rest : "";
  const urls = IPFS_GATEWAYS.map((g) => `${g}${cid.cid}${rest}`);
  if (/^https?:\/\//i.test(String(raw))) urls.unshift(String(raw).trim());
  return [...new Set(urls)];
}

export function mediaProxySrc(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("/")) return url;
  return `/api/media?u=${encodeURIComponent(url)}`;
}
