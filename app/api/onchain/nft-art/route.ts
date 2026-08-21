import { NextResponse } from "next/server";
import { fetchNftArtwork } from "@/lib/nft-art";

export const revalidate = 3600;
export const maxDuration = 20;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const contract = url.searchParams.get("contract") || "";
  const tokenId = url.searchParams.get("tokenId") || "";
  const chain = url.searchParams.get("chain") || "";
  if (!contract || !tokenId) {
    return NextResponse.json({ error: "contract and tokenId required" }, { status: 400 });
  }
  const art = await fetchNftArtwork(contract, tokenId, chain);
  return NextResponse.json(art || { image_url: null });
}
