import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

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
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="container-app flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary">
              <span className="text-xs font-bold">P3</span>
            </div>
            <span className="font-semibold">
              Pow<span className="text-primary">3</span>Folio
            </span>
          </Link>
          <div className="flex items-center gap-3 text-sm text-foreground-muted">
            {profile?.username && (
              <Link
                href={`/${profile.username}`}
                className="btn-ghost text-xs hidden sm:inline-flex"
                target="_blank"
              >
                View profile
              </Link>
            )}
            <span className="hidden sm:inline">{user.email}</span>
            <form action="/auth/signout" method="post">
              <button type="submit" className="btn-ghost text-xs">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="container-app py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Manage your proof of work and public profile.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/dashboard/profile"
            className="card transition-colors hover:border-primary/40"
          >
            <h3 className="font-medium">Profile</h3>
            <p className="mt-1 text-xs text-primary">Edit now →</p>
          </Link>

          <Link
            href="/dashboard/writing"
            className="card transition-colors hover:border-primary/40"
          >
            <h3 className="font-medium">Writing</h3>
            <p className="mt-1 text-xs text-primary">Manage →</p>
          </Link>

          <Link
            href="/dashboard/trading"
            className="card transition-colors hover:border-primary/40"
          >
            <h3 className="font-medium">Trading Record</h3>
            <p className="mt-1 text-xs text-primary">Manage →</p>
          </Link>

          <Link
            href="/dashboard/community"
            className="card transition-colors hover:border-primary/40"
          >
            <h3 className="font-medium">Community</h3>
            <p className="mt-1 text-xs text-primary">Manage →</p>
          </Link>

          <Link
            href="/dashboard/airdrops"
            className="card transition-colors hover:border-primary/40"
          >
            <h3 className="font-medium">Airdrops</h3>
            <p className="mt-1 text-xs text-primary">Manage →</p>
          </Link>

          <div className="card opacity-80">
            <h3 className="font-medium">Docs & NFTs</h3>
            <p className="mt-1 text-xs text-foreground-subtle">Next skeleton</p>
          </div>
        </div>

        {profile?.username && (
          <div className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6">
            <h2 className="font-semibold text-primary">Your public link</h2>
            <p className="mt-2 text-sm text-foreground-muted">
              <Link
                href={`/${profile.username}`}
                className="text-primary hover:underline"
                target="_blank"
              >
                pow3folio.vercel.app/{profile.username}
              </Link>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
