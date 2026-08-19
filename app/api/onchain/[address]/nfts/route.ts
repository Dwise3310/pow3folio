import { NextResponse } from "next/server";
import { loadWalletNfts } from "@/lib/nfts";

export const revalidate = 300;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const nfts = await loadWalletNfts(address);
  return NextResponse.json({ nfts });
}
