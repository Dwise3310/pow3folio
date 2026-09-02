import { NextResponse } from "next/server";
import { type CustomChainInput, type ImportedTokenRef } from "@/lib/onchain";
import { loadOnchainFootprintFast } from "@/lib/onchain-fast";
import { enrichFootprint, normalizeExtraChains } from "@/lib/chain-enrich";

export const revalidate = 120;
export const maxDuration = 20;

function parseJson<T>(raw: string | null): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed.slice(0, 20) : [];
  } catch {
    return [];
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  const url = new URL(req.url);
  const extra = normalizeExtraChains(parseJson<CustomChainInput>(url.searchParams.get("chains")));
  const imported = parseJson<ImportedTokenRef>(url.searchParams.get("tokens"));

  let data;
  try {
    data = await loadOnchainFootprintFast(address, extra, imported);
  } catch (err) {
    console.error("[onchain] loadOnchainFootprint failed:", err);
    return NextResponse.json({ error: "Onchain lookup failed" }, { status: 502 });
  }

  if (!data) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  try {
    await Promise.race([
      enrichFootprint(data, extra, imported),
      new Promise((resolve) => setTimeout(resolve, 4000)),
    ]);
  } catch (err) {
    console.error("[onchain] enrichFootprint failed:", err);
  }

  return NextResponse.json(data);
}
