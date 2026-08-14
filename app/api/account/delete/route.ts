import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const TABLES = [
  "trade_updates",
  "trades",
  "writings",
  "community_items",
  "airdrops",
  "collectibles",
  "credentials",
] as const;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const confirmEmail =
      typeof body?.confirmEmail === "string" ? body.confirmEmail.trim().toLowerCase() : "";
    const phrase = typeof body?.phrase === "string" ? body.phrase.trim() : "";

    if (phrase.toUpperCase() !== "DELETE") {
      return NextResponse.json({ error: "Confirmation phrase required" }, { status: 400 });
    }

    const loginEmail = (user.email || "").toLowerCase();
    if (!loginEmail || confirmEmail !== loginEmail) {
      return NextResponse.json({ error: "Email confirmation failed" }, { status: 400 });
    }

    const uid = user.id;

    // Wipe proof tables first (RLS should allow owner deletes)
    for (const table of TABLES) {
      const { error } = await supabase.from(table).delete().eq("user_id", uid);
      if (error && !error.message.toLowerCase().includes("does not exist")) {
        console.error("delete", table, error.message);
      }
    }

    // Soft-clear profile public fields then delete row if allowed
    await supabase
      .from("profiles")
      .update({
        is_public: false,
        bio: null,
        long_bio: null,
        avatar_url: null,
        banner_url: null,
        skills: [],
        work_experience: [],
        education: [],
        trading_platforms: [],
        wallet_address: null,
        ens_name: null,
        x_url: null,
        telegram_url: null,
        github_url: null,
        website_url: null,
        secondary_email: null,
      })
      .eq("id", uid);

    await supabase.from("profiles").delete().eq("id", uid);

    // Prefer service role for auth user deletion
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (serviceKey && url) {
      const admin = createAdminClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { error: delErr } = await admin.auth.admin.deleteUser(uid);
      if (delErr) {
        console.error("auth delete", delErr.message);
        // Still sign out client session below
      }
    }

    await supabase.auth.signOut();

    return NextResponse.json({
      ok: true,
      note: serviceKey
        ? "Account and data removed."
        : "Data wiped and signed out. Add SUPABASE_SERVICE_ROLE_KEY to fully remove the auth user.",
    });
  } catch (e) {
    console.error("account delete", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
