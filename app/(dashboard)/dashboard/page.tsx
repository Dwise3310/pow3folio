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

  return (
    <div className="min-h-screen">
      {/* Top bar */}
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
            Stage 0 complete. Profile & proof sections come next.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: "Profile", status: "Coming in Stage 1" },
            { title: "Writing", status: "Coming in Stage 1" },
            { title: "Trading Record", status: "Coming in Stage 1" },
            { title: "Community", status: "Coming in Stage 1" },
            { title: "Airdrops", status: "Phase 2" },
            { title: "Docs & NFTs", status: "Phase 2" },
          ].map((item) => (
            <div key={item.title} className="card">
              <h3 className="font-medium">{item.title}</h3>
              <p className="mt-1 text-xs text-foreground-subtle">{item.status}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6">
          <h2 className="font-semibold text-primary">You're in</h2>
          <p className="mt-2 text-sm text-foreground-muted">
            Auth is working. Next we build the profile editor, public
            <code className="mx-1 rounded bg-surface px-1.5 py-0.5 text-xs">
              /username
            </code>
            pages, and the proof-of-work sections.
          </p>
        </div>
      </main>
    </div>
  );
}
