import { NextResponse } from "next/server";
import { gatewayUrls, rewriteUrl, sniffMediaType } from "@/lib/nft-media";

export const revalidate = 86400;
export const maxDuration = 20;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const MAX_BYTES = 12 * 1024 * 1024;

async function fetchMedia(url: string) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/gif,image/*,video/mp4,video/webm,*/*;q=0.8",
        "User-Agent": UA,
      },
      redirect: "follow",
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") || "").toLowerCase();
    if (type.includes("text/html") || type.includes("application/json")) return null;
    const buf = await res.arrayBuffer();
    if (!buf.byteLength || buf.byteLength > MAX_BYTES) return null;
    const sniffed = sniffMediaType(buf, type);
    if (!sniffed) return null;
    return { buf, type: sniffed.contentType };
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

  const candidates = [parsed.toString(), ...gatewayUrls(parsed.toString()), rewriteUrl(parsed.toString())].filter(
    (u, i, arr) => arr.indexOf(u) === i
  );

  try {
    for (const url of candidates.slice(0, 8)) {
      const hit = await fetchMedia(url);
      if (!hit) continue;
      return new NextResponse(hit.buf, {
        headers: {
          "Content-Type": hit.type,
          "Cache-Control": "public, max-age=86400, immutable",
        },
      });
    }
    return NextResponse.json({ error: "fetch", code: "GATEWAY_BLOCKED" }, { status: 502 });
  } catch {
    return NextResponse.json({ error: "failed", code: "MEDIA_TEMPORARILY_UNAVAILABLE" }, { status: 502 });
  }
}
