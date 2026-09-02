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

export type NftMediaKind =
  | "image"
  | "gif"
  | "video"
  | "audio"
  | "html"
  | "3d"
  | "svg"
  | "unknown";

export type NftMediaAsset = {
  type: NftMediaKind;
  url: string;
  originalUrl?: string;
  posterUrl?: string;
  contentType?: string;
  source: string;
};

export type NftMediaManifest = {
  primary: NftMediaAsset | null;
  animation: NftMediaAsset | null;
  posterUrl: string | null;
  failure?: NftMediaFailure | null;
};

export type NftMediaFailure =
  | "METADATA_NOT_FOUND"
  | "MEDIA_NOT_FOUND"
  | "MEDIA_UNSUPPORTED"
  | "MEDIA_TEMPORARILY_UNAVAILABLE"
  | "PROVIDER_TIMEOUT"
  | "GATEWAY_BLOCKED"
  | "OWNERSHIP_FAILED";

const CID_RE = /(?:Qm[1-9A-HJ-NP-Za-km-z]{44,}|bafy[a-z0-9]{20,}|bafk[a-z0-9]{20,}|baf[a-z0-9]{20,})/i;

export function extractCid(raw: string | null | undefined): { cid: string; rest: string } | null {
  if (raw == null) return null;
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
  if (raw == null) return null;
  const value = String(raw).trim().replace(/^"|"$/g, "");
  if (!value) return null;
  if (value.startsWith("ar://")) return `https://arweave.net/${value.slice(5)}`;
  if (value.startsWith("data:")) return value;
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
  if (url.startsWith("/") || url.startsWith("data:")) return url;
  return `/api/media?u=${encodeURIComponent(url)}`;
}

export function isTrustedMediaHost(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host.endsWith("alchemy.com") ||
      host.endsWith("alchemyapi.com") ||
      host.endsWith("cloudinary.com") ||
      host.endsWith("seadn.io") ||
      host.endsWith("openseauserdata.com") ||
      host.endsWith("reservoir.tools") ||
      host.includes("supabase.co") ||
      host.includes("pow3folio")
    );
  } catch {
    return false;
  }
}

export function classifyByHint(url: string | null | undefined, contentType?: string | null): NftMediaKind {
  const type = (contentType || "").toLowerCase();
  if (type.includes("video/")) return "video";
  if (type === "image/gif" || type.includes("gif")) return "gif";
  if (type.includes("svg")) return "svg";
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("audio/")) return "audio";
  if (type.includes("html")) return "html";
  if (type.includes("gltf") || type.includes("glb")) return "3d";

  const value = (url || "").toLowerCase().split("?")[0];
  if (value.endsWith(".mp4") || value.endsWith(".webm") || value.endsWith(".mov")) return "video";
  if (value.endsWith(".gif")) return "gif";
  if (value.endsWith(".svg")) return "svg";
  if (value.endsWith(".mp3") || value.endsWith(".wav") || value.endsWith(".ogg")) return "audio";
  if (value.endsWith(".html") || value.endsWith(".htm")) return "html";
  if (value.endsWith(".glb") || value.endsWith(".gltf")) return "3d";
  if (/\.(png|jpe?g|webp|avif|bmp)$/.test(value)) return "image";
  return "unknown";
}

export function sniffMediaType(buf: ArrayBuffer, headerType = ""): { kind: NftMediaKind; contentType: string } | null {
  const bytes = new Uint8Array(buf.slice(0, 16));
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { kind: "image", contentType: "image/png" };
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return { kind: "image", contentType: "image/jpeg" };
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return { kind: "gif", contentType: "image/gif" };
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[8] === 0x57 && bytes[9] === 0x45) {
    return { kind: "image", contentType: "image/webp" };
  }
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    return { kind: "video", contentType: headerType.startsWith("video/") ? headerType : "video/mp4" };
  }
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return { kind: "video", contentType: "video/webm" };
  }
  const header = headerType.toLowerCase();
  if (header.includes("gif")) return { kind: "gif", contentType: "image/gif" };
  if (header.startsWith("image/svg")) return { kind: "svg", contentType: "image/svg+xml" };
  if (header.startsWith("image/")) return { kind: "image", contentType: header };
  if (header.startsWith("video/")) return { kind: "video", contentType: header };
  if (header.startsWith("audio/")) return { kind: "audio", contentType: header };
  return null;
}
