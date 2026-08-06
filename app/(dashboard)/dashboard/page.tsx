import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import DashboardHome from "@/components/dashboard/DashboardHome";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "username, show_writing, show_trading, show_community, show_airdrops, show_nfts, show_credentials"
    )
    .eq("id", user.id)
    .maybeSingle();

  const flags = {
    show_writing: profile?.show_writing !== false,
    show_trading: profile?.show_trading !== false,
    show_community: profile?.show_community !== false,
    show_airdrops: profile?.show_airdrops !== false,
    show_nfts: profile?.show_nfts !== false,
    show_credentials: profile?.show_credentials !== false,
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="container-app flex h-14 items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
              <span className="text-xs font-bold">P3</span>
            </div>
            <span className="font-semibold truncate">
              Pow<span className="text-primary">3</span>Folio
            </span>
          </Link>
          <div className="flex items-center gap-2 text-sm text-foreground-muted">
            {profile?.username && (
              <Link
                href={`/${profile.username}`}
                className="btn-ghost text-xs hidden sm:inline-flex"
                target="_blank"
              >
                View profile
              </Link>
            )}
            <span className="hidden md:inline truncate max-w-[10rem]">{user.email}</span>
            <form action="/auth/signout" method="post">
              <button type="submit" className="btn-ghost text-xs">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <DashboardHome
        userId={user.id}
        username={profile?.username ?? null}
        email={user.email ?? null}
        flags={flags}
      />
    </div>
  );
}
