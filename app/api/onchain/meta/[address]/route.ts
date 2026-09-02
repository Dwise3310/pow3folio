import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;

const PREFS = "__pow3_prefs";

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

  const chains = Array.isArray(data?.custom_chains) ? data.custom_chains : [];
  const hidden = chains.find((c: { id?: string; name?: string }) => c?.id === PREFS || c?.name === PREFS) as
    | { public_chain_ids?: string[]; imported_tokens?: unknown[] }
    | undefined;
  const visibleChains = chains.filter((c: { id?: string; name?: string }) => c?.id !== PREFS && c?.name !== PREFS);

  return NextResponse.json({
    ...(data || {}),
    custom_chains: visibleChains,
    public_chain_ids: data?.public_chain_ids ?? hidden?.public_chain_ids ?? null,
    imported_tokens: data?.imported_tokens ?? hidden?.imported_tokens ?? [],
  });
}
