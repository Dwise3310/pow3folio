import { NextResponse } from "next/server";
import { loadOnchainFootprint } from "@/lib/onchain";

export const revalidate = 300;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const data = await loadOnchainFootprint(address);
  if (!data) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }
  return NextResponse.json(data);
}
