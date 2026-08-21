import { NextResponse } from "next/server";
import { importNftFromInput } from "@/lib/nft-import";

export const maxDuration = 30;

export async function POST(req: Request) {
  let body: { url?: string; walletAddress?: string } = {};
  try {
    body = (await req.json()) as { url?: string; walletAddress?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const url = (body.url || "").trim();
  const walletAddress = (body.walletAddress || "").trim();
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });
  if (!walletAddress) return NextResponse.json({ error: "walletAddress required" }, { status: 400 });
  const result = await importNftFromInput({ url, walletAddress });
  const status = result.error && !result.contractAddress ? 400 : 200;
  return NextResponse.json(result, { status });
}
