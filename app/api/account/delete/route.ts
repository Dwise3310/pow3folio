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
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

    if (!url || !serviceKey) {
      return NextResponse.json(
        {
          error:
            "Hard delete needs SUPABASE_SERVICE_ROLE_KEY on Vercel. Add it, redeploy, try again.",
        },
        { status: 503 }
      );
    }

    const admin = createAdminClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Bypass RLS: wipe all related rows as service role
    for (const table of TABLES) {
      const { error } = await admin.from(table).delete().eq("user_id", uid);
      if (error) console.error("hard delete", table, error.message);
    }

    const { error: profileErr } = await admin.from("profiles").delete().eq("id", uid);
    if (profileErr) console.error("hard delete profiles", profileErr.message);

    const { error: delErr } = await admin.auth.admin.deleteUser(uid);
    if (delErr) {
      console.error("auth delete", delErr.message);
      return NextResponse.json(
        { error: "Data wiped but auth user delete failed: " + delErr.message },
        { status: 500 }
      );
    }

    try {
      await supabase.auth.signOut();
    } catch {
      /* session may already be invalid */
    }

    return NextResponse.json({ ok: true, note: "Account and all data permanently deleted." });
  } catch (e) {
    console.error("account delete", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
