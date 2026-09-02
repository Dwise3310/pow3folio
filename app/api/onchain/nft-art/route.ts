import { NextResponse } from "next/server";
import { resolveNftMedia } from "@/lib/nft-engine";

export const revalidate = 3600;
export const maxDuration = 20;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const contract = url.searchParams.get("contract") || "";
  const tokenId = url.searchParams.get("tokenId");
  const chain = url.searchParams.get("chain") || "";
  if (!contract || tokenId == null || tokenId === "") {
    return NextResponse.json({ error: "contract and tokenId required" }, { status: 400 });
  }
  const resolved = await resolveNftMedia({
    contract,
    tokenId,
    chain,
    verifyOwnership: false,
  });
  return NextResponse.json({
    image_url: resolved.image,
    title: resolved.name,
    url: resolved.marketplaceUrl,
    chain: resolved.chain,
    collection_name: resolved.collection,
    media: resolved.media,
    failure: resolved.failure,
    tokenUri: resolved.tokenUri,
    standard: resolved.standard,
  });
}
