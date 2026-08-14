import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Only allow same-origin relative paths. Blocks //evil.com and external URLs. */
function safeNextPath(raw: string | null): string {
  if (!raw) return "/dashboard";
  const path = raw.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
    return "/dashboard";
  }
  // No protocol-looking segments
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(path)) return "/dashboard";
  return path.slice(0, 200) || "/dashboard";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const updates: Record<string, string> = {};
          const identities = user.identities ?? [];

          for (const id of identities) {
            const meta = (id.identity_data ?? {}) as Record<string, string>;
            if (id.provider === "twitter" || id.provider === "x") {
              const handle =
                meta.user_name ||
                meta.preferred_username ||
                meta.screen_name ||
                meta.username;
              if (handle && /^[A-Za-z0-9_]{1,30}$/.test(handle)) {
                updates.x_url = `https://x.com/${handle}`;
              }
            }
            if (id.provider === "github") {
              const handle = meta.user_name || meta.preferred_username || meta.login;
              if (handle && /^[A-Za-z0-9-]{1,39}$/.test(handle)) {
                updates.github_url = `https://github.com/${handle}`;
              }
            }
          }

          if (Object.keys(updates).length > 0) {
            await supabase.from("profiles").update(updates).eq("id", user.id);
          }
        }
      } catch {
        /* non-fatal */
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
