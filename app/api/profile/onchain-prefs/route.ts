import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const PREFS_MARKER = "__pow3_prefs";

type PrefsPatch = {
  public_chain_ids?: string[] | null;
  imported_tokens?: { chainId: string; contract: string }[] | null;
};

function isColumnError(err: { message?: string; code?: string } | null) {
  if (!err) return false;
  return err.code === "42703" || /column/i.test(err.message || "");
}

function asChains(raw: unknown): Record<string, unknown>[] {
  return Array.isArray(raw) ? raw.filter((x) => x && typeof x === "object") : [];
}

export function extractPrefs(customChains: unknown): PrefsPatch {
  const row = asChains(customChains).find(
    (c) => c.id === PREFS_MARKER || c.name === PREFS_MARKER
  ) as PrefsPatch & Record<string, unknown> | undefined;
  if (!row) return {};
  return {
    public_chain_ids: Array.isArray(row.public_chain_ids) ? row.public_chain_ids : undefined,
    imported_tokens: Array.isArray(row.imported_tokens) ? row.imported_tokens : undefined,
  };
}

export function stripPrefs(customChains: unknown): Record<string, unknown>[] {
  return asChains(customChains).filter((c) => c.id !== PREFS_MARKER && c.name !== PREFS_MARKER);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: PrefsPatch = {};
  try {
    body = (await req.json()) as PrefsPatch;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if ("public_chain_ids" in body) {
    const ids = (body.public_chain_ids || []).map((x) => String(x)).filter(Boolean);
    if (ids.length < 1) {
      return NextResponse.json({ error: "At least one chain must stay public." }, { status: 400 });
    }
    patch.public_chain_ids = ids;
  }
  if ("imported_tokens" in body) {
    patch.imported_tokens = body.imported_tokens || [];
  }
  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "Nothing to save" }, { status: 400 });
  }

  const direct = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (!direct.error) return NextResponse.json({ ok: true, stored: "columns" });
  if (!isColumnError(direct.error)) {
    return NextResponse.json({ error: direct.error.message }, { status: 400 });
  }

  const current = await supabase.from("profiles").select("custom_chains").eq("id", user.id).maybeSingle();
  if (current.error) return NextResponse.json({ error: current.error.message }, { status: 400 });

  const existing = extractPrefs(current.data?.custom_chains);
  const nextPrefs = {
    id: PREFS_MARKER,
    name: PREFS_MARKER,
    public_chain_ids: patch.public_chain_ids ?? existing.public_chain_ids ?? null,
    imported_tokens: patch.imported_tokens ?? existing.imported_tokens ?? [],
  };
  const nextChains = [...stripPrefs(current.data?.custom_chains), nextPrefs];
  const fallback = await supabase.from("profiles").update({ custom_chains: nextChains }).eq("id", user.id);
  if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 400 });
  return NextResponse.json({ ok: true, stored: "custom_chains" });
}
