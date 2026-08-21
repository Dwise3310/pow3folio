import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;

export async function GET(_req: Request, { params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  const wallet = (address || "").trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(wallet)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("custom_chains, public_chain_ids, imported_tokens, extra_wallets, show_dust_tokens, wallet_address")
    .eq("is_public", true)
    .ilike("wallet_address", wallet)
    .maybeSingle();
  return NextResponse.json(data || {});
}
