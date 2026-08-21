import { NextResponse } from "next/server";
import { extractCid, gatewayUrls } from "@/lib/nft-media";

export const revalidate = 86400;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function fetchImage(url: string) {
  const res = await fetch(url, {
    headers: {
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      "User-Agent": UA,
    },
    redirect: "follow",
    cache: "force-cache",
  });
  if (!res.ok) return null;
  const type = (res.headers.get("content-type") || "").toLowerCase();
  const buf = await res.arrayBuffer();
  if (!buf.byteLength) return null;
  if (type.includes("text/html") || type.includes("application/json")) return null;
  const looksImage =
    type.startsWith("image/") ||
    type === "application/octet-stream" ||
    type === "" ||
    type === "application/xml" ||
    type.includes("svg");
  if (!looksImage) return null;
  return {
    buf,
    type: type.startsWith("image/") ? type : type.includes("svg") ? "image/svg+xml" : "image/png",
  };
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

  const candidates = [parsed.toString(), ...gatewayUrls(parsed.toString())].filter(
    (u, i, arr) => arr.indexOf(u) === i
  );
  if (!extractCid(parsed.toString()) && candidates.length === 1) {
    /* keep single https */
  }

  try {
    for (const url of candidates.slice(0, 6)) {
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
