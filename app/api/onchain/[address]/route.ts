import { NextResponse } from "next/server";
import { loadOnchainFootprint, type CustomChainInput } from "@/lib/onchain";

export const revalidate = 300;
export const maxDuration = 30;

function parseExtra(raw: string | null): CustomChainInput[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CustomChainInput[];
    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    return [];
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  const extra = parseExtra(new URL(req.url).searchParams.get("chains"));
  const data = await loadOnchainFootprint(address, extra);
  if (!data) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }
  return NextResponse.json(data);
}
