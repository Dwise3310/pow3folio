import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadWalletNfts } from "@/lib/nfts";

export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  const url = new URL(req.url);
  const token = url.searchParams.get("secret") || "";
  if (secret && auth !== `Bearer ${secret}` && token !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "login required unless cron secret is set" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("wallet_address, extra_wallets, last_wallet_scan_at")
    .eq("id", user.id)
    .maybeSingle();

  const addresses = [
    profile?.wallet_address,
    ...(((profile?.extra_wallets as Array<{ address?: string }> | null) || []).map((w) => w.address)),
  ]
    .filter((a): a is string => !!a)
    .map((a) => a.toLowerCase());

  let imported = 0;
  for (const address of [...new Set(addresses)].slice(0, 4)) {
    const nfts = await loadWalletNfts(address);
    const { data: existing } = await supabase.from("collectibles").select("token_id, tags, chain").eq("user_id", user.id);
    const have = new Set(
      (existing || []).map((row) => {
        const ca = ((row.tags as string[]) || []).find((t) => t.startsWith("ca:"))?.slice(3) || "";
        return `${(row.chain || "").toLowerCase()}|${ca}|${row.token_id || ""}`;
      })
    );
    const fresh = nfts.filter((n) => !have.has(`${n.chain.toLowerCase()}|${n.contract}|${n.token_id}`));
    if (!fresh.length) continue;
    const rows = fresh.slice(0, 40).map((n, i) => ({
      user_id: user.id,
      kind: "nft",
      title: n.title,
      description: n.description,
      url: n.url,
      image_url: n.image_url,
      chain: n.chain,
      collection_name: n.collection_name,
      token_id: n.token_id,
      tags: ["imported", "autoscan", n.contract ? `ca:${n.contract}` : ""].filter(Boolean),
      is_visible: true,
      sort_order: 900 + i,
    }));
    await supabase.from("collectibles").insert(rows);
    imported += rows.length;
  }

  await supabase.from("profiles").update({ last_wallet_scan_at: new Date().toISOString() }).eq("id", user.id);
  return NextResponse.json({ ok: true, imported, wallets: addresses.length });
}
