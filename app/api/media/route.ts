import { NextResponse } from "next/server";

function gateways(raw: string): string[] {
  const value = raw.trim();
  const out = new Set<string>();
  if (/^https?:\/\//i.test(value)) out.add(value);
  const ipfs = value.match(/(?:ipfs\/|ipfs:\/\/)([^/?#]+(?:\/[^\s]*)?)/i);
  const cid = value.match(/(Qm[1-9A-HJ-NP-Za-km-z]{44,}|bafy[a-z0-9]+)/i);
  const path = ipfs?.[1] || cid?.[0];
  if (path) {
    out.add(`https://ipfs.io/ipfs/${path}`);
    out.add(`https://cloudflare-ipfs.com/ipfs/${path}`);
    out.add(`https://${path.split("/")[0]}.ipfs.w3s.link/${path.split("/").slice(1).join("/")}`);
  }
  return [...out];
}

export async function GET(req: Request) {
  const target = new URL(req.url).searchParams.get("u") || "";
  if (!target) return new NextResponse("missing url", { status: 400 });

  for (const url of gateways(target)) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "image/*,*/*" },
        redirect: "follow",
      });
      if (!res.ok) continue;
      const type = res.headers.get("content-type") || "image/png";
      if (!type.startsWith("image") && !type.includes("octet-stream")) continue;
      return new NextResponse(res.body, {
        headers: {
          "Content-Type": type.startsWith("image") ? type : "image/png",
          "Cache-Control": "public, max-age=86400, immutable",
        },
      });
    } catch {
      /* try next gateway */
    }
  }
  return new NextResponse("not found", { status: 404 });
}
