import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Pull linked provider handles into the profile for public links
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const updates: Record<string, string> = {};
          const identities = user.identities ?? [];

          for (const id of identities) {
            const meta = (id.identity_data ?? {}) as Record<string, string>;
            if (id.provider === "twitter") {
              const handle = meta.user_name || meta.preferred_username || meta.screen_name;
              if (handle) updates.x_url = `https://x.com/${handle}`;
            }
            if (id.provider === "github") {
              const handle = meta.user_name || meta.preferred_username || meta.login;
              if (handle) updates.github_url = `https://github.com/${handle}`;
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
