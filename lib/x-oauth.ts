import type { Provider, SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase now prefers X OAuth 2.0 as provider "x".
 * Older projects still use legacy "twitter" (OAuth 1.0a).
 * Try both; always force navigation with data.url (mobile often skips auto-redirect).
 */
export async function startXAuth(
  supabase: SupabaseClient,
  mode: "signIn" | "link",
  redirectTo: string
): Promise<{ error: string | null }> {
  const providers = ["x", "twitter"] as Provider[];

  let lastError: string | null = null;

  for (const provider of providers) {
    const result =
      mode === "link"
        ? await supabase.auth.linkIdentity({
            provider,
            options: {
              redirectTo,
              skipBrowserRedirect: true,
            },
          })
        : await supabase.auth.signInWithOAuth({
            provider,
            options: {
              redirectTo,
              skipBrowserRedirect: true,
            },
          });

    if (result.error) {
      lastError = result.error.message;
      // try next provider id
      continue;
    }

    const url = result.data?.url;
    if (url) {
      window.location.assign(url);
      return { error: null };
    }

    lastError = "No OAuth URL returned from Supabase for X. Check provider is enabled.";
  }

  return {
    error:
      lastError +
      " Enable X / Twitter (OAuth 2.0) in Supabase under Sign In / Providers, paste Client ID and Secret from developer.x.com, and set Callback URL to your Supabase callback.",
  };
}
