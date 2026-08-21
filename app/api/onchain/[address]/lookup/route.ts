import { NextResponse } from "next/server";
import { lookupWalletToken, type CustomChainInput } from "@/lib/onchain";
import { lookupWalletNfts } from "@/lib/nfts";

export const revalidate = 60;
export const maxDuration = 30;

export async function GET(req: Request, { params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  const url = new URL(req.url);
  const contract = url.searchParams.get("contract") || "";
  const tokenId = url.searchParams.get("tokenId") || "";
  const chain = url.searchParams.get("chain") || "";
  let extra: CustomChainInput[] = [];
  try {
    extra = JSON.parse(url.searchParams.get("chains") || "[]") as CustomChainInput[];
    extra = Array.isArray(extra) ? extra.slice(0, 8) : [];
  } catch {
    extra = [];
  }
  const [tokens, nfts] = await Promise.all([
    lookupWalletToken(address, contract, { chainId: chain || null, extraChains: extra }),
    lookupWalletNfts(address, contract, tokenId || null),
  ]);
  return NextResponse.json({ tokens, nfts });
}
