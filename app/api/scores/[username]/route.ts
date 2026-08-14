import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeScores } from "@/lib/ai/scores";
import type {
  Profile,
  Writing,
  Trade,
  CommunityItem,
  Airdrop,
  Collectible,
  Credential,
} from "@/types/database";

export const runtime = "nodejs";

type Params = { params: Promise<{ username: string }> };

function sanitizeUsername(raw: string): string | null {
  const u = raw.trim().toLowerCase();
  if (!/^[a-z0-9_]{1,32}$/.test(u)) return null;
  return u;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { username: raw } = await params;
  const username = sanitizeUsername(raw || "");
  if (!username) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .eq("is_public", true)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const p = profile as Profile;

  const [
    { data: writings },
    { data: trades },
    { data: community },
    { data: airdrops },
    { data: collectibles },
    { data: credentials },
  ] = await Promise.all([
    supabase.from("writings").select("*").eq("user_id", p.id).eq("is_visible", true),
    supabase.from("trades").select("*").eq("user_id", p.id).eq("is_visible", true),
    supabase.from("community_items").select("*").eq("user_id", p.id).eq("is_visible", true),
    supabase.from("airdrops").select("*").eq("user_id", p.id).eq("is_visible", true),
    supabase.from("collectibles").select("*").eq("user_id", p.id).eq("is_visible", true),
    supabase.from("credentials").select("*").eq("user_id", p.id).eq("is_visible", true),
  ]);

  const scores = computeScores({
    profile: p,
    writings: (writings as Writing[]) ?? [],
    trades: (trades as Trade[]) ?? [],
    community: (community as CommunityItem[]) ?? [],
    airdrops: (airdrops as Airdrop[]) ?? [],
    nfts: (collectibles as Collectible[]) ?? [],
    credentials: (credentials as Credential[]) ?? [],
  });

  return NextResponse.json({
    profileScore: scores.profileScore,
    builderScore: scores.builderScore,
    completenessPct: scores.completenessPct,
    checklist: scores.checklist,
  });
}
