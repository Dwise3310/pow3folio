import { NextResponse } from "next/server";
import { lookupWalletToken } from "@/lib/onchain";
import { lookupWalletNfts } from "@/lib/nfts";

export const revalidate = 60;
export const maxDuration = 30;

export async function GET(req: Request, { params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  const url = new URL(req.url);
  const contract = url.searchParams.get("contract") || "";
  const tokenId = url.searchParams.get("tokenId") || "";
  const [tokens, nfts] = await Promise.all([
    lookupWalletToken(address, contract),
    lookupWalletNfts(address, contract, tokenId || null),
  ]);
  return NextResponse.json({ tokens, nfts });
}
