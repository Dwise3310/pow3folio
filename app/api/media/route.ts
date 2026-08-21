import { NextResponse } from "next/server";
import { gatewayUrls, rewriteUrl } from "@/lib/nft-media";

export const revalidate = 86400;
export const maxDuration = 20;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function sniffType(buf: ArrayBuffer, headerType: string) {
  const bytes = new Uint8Array(buf.slice(0, 12));
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "image/gif";
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[8] === 0x57 && bytes[9] === 0x45) return "image/webp";
  if (headerType.startsWith("image/")) return headerType;
  return null;
}

async function fetchImage(url: string) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "User-Agent": UA,
      },
      redirect: "follow",
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") || "").toLowerCase();
    if (type.includes("text/html") || type.includes("application/json")) return null;
    const buf = await res.arrayBuffer();
    if (!buf.byteLength) return null;
    const sniffed = sniffType(buf, type);
    if (!sniffed) return null;
    return { buf, type: sniffed };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function GET(req: Request) {
  const target = new URL(req.url).searchParams.get("u") || "";
  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: "bad url" }, { status: 400 });
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    return NextResponse.json({ error: "protocol" }, { status: 400 });
  }
  if (["localhost", "127.0.0.1", "0.0.0.0"].includes(parsed.hostname)) {
    return NextResponse.json({ error: "host" }, { status: 400 });
  }

  const candidates = [...gatewayUrls(parsed.toString()), rewriteUrl(parsed.toString())].filter(
    (u, i, arr) => arr.indexOf(u) === i
  );

  try {
    for (const url of candidates.slice(0, 8)) {
      const hit = await fetchImage(url);
      if (!hit) continue;
      return new NextResponse(hit.buf, {
        headers: {
          "Content-Type": hit.type,
          "Cache-Control": "public, max-age=86400, immutable",
        },
      });
    }
    return NextResponse.json({ error: "fetch" }, { status: 502 });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 502 });
  }
}
