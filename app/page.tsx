import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ThemeToggle from "@/components/theme/ThemeToggle";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-[0.15]"
        style={{ backgroundSize: "48px 48px" }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />

      <header className="relative z-10 border-b border-border/60">
        <div className="container-app flex h-14 sm:h-16 items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <span className="text-sm font-bold">P3</span>
            </div>
            <span className="text-base sm:text-lg font-semibold tracking-tight truncate">
              Pow<span className="text-primary">3</span>Folio
            </span>
          </Link>

          <div className="flex items-center gap-1 sm:gap-3">
            <ThemeToggle />
            {user ? (
              <Link href="/dashboard" className="btn-primary text-xs sm:text-sm">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn-ghost text-xs sm:text-sm hidden xs:inline-flex sm:inline-flex">
                  Log in
                </Link>
                <Link href="/signup" className="btn-primary text-xs sm:text-sm">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="container-app flex flex-col items-center py-16 sm:py-24 md:py-32 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-foreground-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Built for Web3 professionals
          </div>

          <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Your proof of work.{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              One clean link.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-sm text-foreground-muted sm:text-lg px-1">
            Showcase trading records, community contributions, writing, airdrops
            and on-chain activity. The professional identity layer crypto actually
            needs.
          </p>

          <div className="mt-8 sm:mt-10 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
            {user ? (
              <Link href="/dashboard" className="btn-primary px-6 py-3 text-base">
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link href="/signup" className="btn-primary px-6 py-3 text-base">
                  Create your portfolio
                </Link>
                <Link href="/login" className="btn-secondary px-6 py-3 text-base">
                  Log in
                </Link>
              </>
            )}
          </div>

          <div className="mt-14 sm:mt-20 grid w-full max-w-4xl gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
            {[
              {
                title: "Trading Record",
                desc: "Win rate, ROI, charts and full trade timelines.",
              },
              {
                title: "Community Work",
                desc: "Roles, projects and contributions that matter.",
              },
              {
                title: "On-chain Proof",
                desc: "Wallet age, activity and verifiable history.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="card text-left transition-colors hover:border-primary/30"
              >
                <h3 className="font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm text-foreground-muted">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border/60 py-8">
        <div className="container-app text-center text-sm text-foreground-subtle">
          © {new Date().getFullYear()} Pow3Folio. Built for the Web3 generation.
        </div>
      </footer>
    </div>
  );
}
