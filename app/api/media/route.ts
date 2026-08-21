import { NextResponse } from "next/server";

export const revalidate = 86400;

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
  try {
    const res = await fetch(parsed.toString(), {
      headers: { Accept: "image/*,*/*;q=0.8" },
      redirect: "follow",
    });
    if (!res.ok) return NextResponse.json({ error: "fetch" }, { status: 502 });
    const buf = await res.arrayBuffer();
    const type = res.headers.get("content-type") || "image/png";
    if (!type.startsWith("image/") && type !== "application/octet-stream") {
      return NextResponse.json({ error: "not image" }, { status: 415 });
    }
    return new NextResponse(buf, {
      headers: {
        "Content-Type": type.startsWith("image/") ? type : "image/png",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 502 });
  }
}
