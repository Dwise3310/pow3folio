import { NextResponse } from "next/server";
import { resolveNftMedia } from "@/lib/nft-engine";

export const revalidate = 600;
export const maxDuration = 20;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const contract = url.searchParams.get("contract") || "";
  const tokenId = url.searchParams.get("tokenId");
  const chain = url.searchParams.get("chain") || "";
  const nftUrl = url.searchParams.get("url") || "";
  if (!nftUrl && (!contract || tokenId == null || tokenId === "")) {
    return NextResponse.json({ error: "contract and tokenId required" }, { status: 400 });
  }
  const resolved = await resolveNftMedia({
    url: nftUrl || undefined,
    contract: contract || undefined,
    tokenId: tokenId == null ? undefined : tokenId,
    chain,
    verifyOwnership: false,
  });
  return NextResponse.json(resolved);
}

export async function POST(req: Request) {
  let body: { url?: string; contract?: string; tokenId?: string; chain?: string; walletAddress?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const resolved = await resolveNftMedia({
    url: body.url,
    contract: body.contract,
    tokenId: body.tokenId,
    chain: body.chain,
    walletAddress: body.walletAddress,
    verifyOwnership: !!body.walletAddress,
  });
  return NextResponse.json(resolved);
}
