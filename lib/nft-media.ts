export const IPFS_GATEWAYS = [
  "https://gateway.pinata.cloud/ipfs/",
  "https://nftstorage.link/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://4everland.io/ipfs/",
  "https://dweb.link/ipfs/",
  "https://cf-ipfs.com/ipfs/",
  "https://w3s.link/ipfs/",
  "https://ipfs.io/ipfs/",
] as const;

const CID_RE = /(?:Qm[1-9A-HJ-NP-Za-km-z]{44,}|bafy[a-z0-9]{20,}|bafk[a-z0-9]{20,}|baf[a-z0-9]{20,})/i;

export function extractCid(raw: string | null | undefined): { cid: string; rest: string } | null {
  if (!raw) return null;
  const value = String(raw).trim();
  if (!value) return null;

  const ipfsProto = value.match(/^ipfs:\/\/(?:ipfs\/)?([^/?#]+)(.*)$/i);
  if (ipfsProto) return { cid: ipfsProto[1], rest: ipfsProto[2] || "" };

  const w3s = value.match(/^https?:\/\/([a-z0-9]+)\.ipfs\.w3s\.link(\/.*)?$/i);
  if (w3s) return { cid: w3s[1], rest: w3s[2] || "" };

  const cf = value.match(/^https?:\/\/([a-z0-9]+)\.ipfs\.(?:dweb|cf)\.link(\/.*)?$/i);
  if (cf) return { cid: cf[1], rest: cf[2] || "" };

  const path = value.match(/\/ipfs\/([^/?#]+)(.*)$/i);
  if (path) return { cid: path[1], rest: path[2] || "" };

  const cidOnly = value.match(CID_RE);
  if (cidOnly && !/^https?:\/\//i.test(value)) return { cid: cidOnly[0], rest: "" };
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
  if (/^https?:\/\//i.test(value)) return value;
  const cid = extractCid(value);
  if (cid) {
    const rest = cid.rest && cid.rest !== "/" ? cid.rest : "";
    return `${IPFS_GATEWAYS[0]}${cid.cid}${rest}`;
  }
  return null;
}

export function rewriteUrl(url: string) {
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=jpg&n=-1`;
}

export function gatewayUrls(raw: string | null | undefined): string[] {
  const resolved = resolveMediaUrl(raw);
  if (!resolved) return [];
  const cid = extractCid(raw || resolved);
  const urls: string[] = [];
  if (/^https?:\/\//i.test(String(raw || "").trim())) urls.push(String(raw).trim());
  if (resolved) urls.push(resolved);
  if (cid) {
    const rest = cid.rest && cid.rest !== "/" ? cid.rest : "";
    urls.push(`https://${cid.cid}.ipfs.w3s.link${rest}`);
    urls.push(`https://${cid.cid}.ipfs.dweb.link${rest}`);
    for (const g of IPFS_GATEWAYS) urls.push(`${g}${cid.cid}${rest}`);
  }
  urls.push(rewriteUrl(urls[0] || resolved));
  return [...new Set(urls.filter(Boolean))];
}

export function mediaProxySrc(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("/")) return url;
  return `/api/media?u=${encodeURIComponent(url)}`;
}
