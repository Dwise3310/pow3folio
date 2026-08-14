import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ThemeToggle from "@/components/theme/ThemeToggle";

const PROOF_SECTIONS = [
  {
    title: "Trading Record",
    desc: "Trades, ROI, charts and timelines. A real track record teams can review.",
    icon: "📈",
  },
  {
    title: "Technical Writing / Research",
    desc: "Threads, Mirror posts and research that show how you think.",
    icon: "✍️",
  },
  {
    title: "Community",
    desc: "Roles, campaigns and contributions teams can verify.",
    icon: "🌐",
  },
  {
    title: "Airdrops & Testnets",
    desc: "Campaigns farmed, chains touched, status in one place.",
    icon: "🪂",
  },
  {
    title: "Docs & Credentials",
    desc: "CV, certificates and proof files under About, owned by you.",
    icon: "📄",
  },
  {
    title: "On chain",
    desc: "Wallet, ENS and NFTs on your public profile when you choose.",
    icon: "🔗",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Create your profile",
    desc: "Username, bio, skills and wallet. One clean public URL.",
  },
  {
    step: "02",
    title: "Add your proof",
    desc: "Trading, writing, community, airdrops and docs. Toggle what the world sees.",
  },
  {
    step: "03",
    title: "Get discovered",
    desc: "Share your link or appear in View talents when teams search for builders like you.",
  },
];

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-[0.08] dark:opacity-[0.12]"
        style={{ backgroundSize: "48px 48px" }}
        aria-hidden
      />
      {/* Soft neutral glow, not heavy green */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[22rem] w-[36rem] -translate-x-1/2 rounded-full bg-zinc-400/10 blur-3xl dark:bg-zinc-500/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute top-[45%] right-0 h-48 w-48 rounded-full bg-sky-500/5 blur-3xl"
        aria-hidden
      />

      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/85 backdrop-blur-md">
        <div className="container-app flex h-14 items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-foreground/5 text-foreground">
              <span className="text-xs font-bold">P3</span>
            </div>
            <span className="text-sm sm:text-base font-semibold tracking-tight truncate">
              Pow<span className="text-primary">3</span>Folio
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-0.5 text-sm">
            <a href="#proof" className="btn-ghost text-xs">
              Proof
            </a>
            <a href="#how" className="btn-ghost text-xs">
              How it works
            </a>
            <Link href="/talents" className="btn-ghost text-xs">
              View talents
            </Link>
          </nav>

          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            {user ? (
              <Link href="/dashboard" className="btn-primary text-xs px-3 py-1.5">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn-ghost text-xs hidden sm:inline-flex">
                  Log in
                </Link>
                <Link href="/signup" className="btn-primary text-xs px-3 py-1.5">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="container-app pt-10 pb-12 sm:pt-16 sm:pb-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] sm:text-xs font-medium uppercase tracking-widest text-foreground-subtle">
              Web3 proof of work
            </p>
            <h1 className="mt-2.5 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.12]">
              Your track record,{" "}
              <span className="text-primary">in one public profile</span>
            </h1>
            <p className="mt-4 text-sm sm:text-base text-foreground-muted max-w-xl mx-auto leading-relaxed">
              Pow3Folio is the portfolio for crypto traders, researchers, community builders and airdrop hunters. Show real trades, writing and contributions so teams can trust you.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              {user ? (
                <Link href="/dashboard" className="btn-primary px-5 py-2.5 text-sm">
                  Open dashboard
                </Link>
              ) : (
                <Link href="/signup" className="btn-primary px-5 py-2.5 text-sm">
                  Create your profile
                </Link>
              )}
              <Link href="/talents" className="btn-secondary px-5 py-2.5 text-sm">
                View talents
              </Link>
            </div>
          </div>
        </section>

        <section id="proof" className="container-app pb-12 sm:pb-16">
          <div className="mx-auto max-w-xl text-center mb-7">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Everything that proves you</h2>
            <p className="mt-2 text-sm text-foreground-muted">
              Toggle what stays public. One profile that updates with you.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PROOF_SECTIONS.map((s) => (
              <div key={s.title} className="card p-4">
                <div className="text-xl mb-2">{s.icon}</div>
                <h3 className="font-semibold text-sm">{s.title}</h3>
                <p className="mt-1 text-xs text-foreground-muted leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="container-app pb-12 sm:pb-16">
          <div className="mx-auto max-w-xl text-center mb-7">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">How it works</h2>
            <p className="mt-2 text-sm text-foreground-muted">Three steps. Built for people who ship.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-3xl mx-auto">
            {STEPS.map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-foreground-muted font-bold text-xs">
                  {s.step}
                </div>
                <h3 className="mt-3 font-semibold text-sm">{s.title}</h3>
                <p className="mt-1.5 text-xs text-foreground-muted leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="container-app pb-12 sm:pb-16">
          <div className="rounded-xl border border-border bg-surface p-5 sm:p-8">
            <div className="grid gap-6 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-foreground-subtle">
                  For teams
                </p>
                <h2 className="mt-1.5 text-xl sm:text-2xl font-bold tracking-tight">
                  Hire builders with real proof
                </h2>
                <p className="mt-2 text-sm text-foreground-muted leading-relaxed">
                  Browse trading records, research, community roles and on chain activity. Find the right talent faster.
                </p>
                <Link href="/talents" className="btn-primary mt-4 inline-flex text-sm">
                  Browse talents
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { k: "Track record", v: "Live trades & ROI" },
                  { k: "Research", v: "Writing you can read" },
                  { k: "Community", v: "Roles you can verify" },
                  { k: "On chain", v: "Wallet & NFTs" },
                ].map((row) => (
                  <div key={row.k} className="rounded-lg border border-border bg-background/80 p-3">
                    <p className="text-[11px] text-foreground-subtle">{row.k}</p>
                    <p className="mt-0.5 text-sm font-medium">{row.v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="container-app pb-12 sm:pb-16">
          <div className="mx-auto max-w-xl rounded-xl border border-border bg-surface px-5 py-8 sm:px-8 text-center">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Ready to show your work?</h2>
            <p className="mt-2 text-sm text-foreground-muted">
              Create your Pow3Folio in minutes. Share one link. Get found by the right teams.
            </p>
            <div className="mt-5 flex flex-col sm:flex-row gap-2.5 justify-center">
              {user ? (
                <Link href="/dashboard" className="btn-primary px-5 py-2.5 text-sm">
                  Open dashboard
                </Link>
              ) : (
                <Link href="/signup" className="btn-primary px-5 py-2.5 text-sm">
                  Get started free
                </Link>
              )}
              <Link href="/talents" className="btn-secondary px-5 py-2.5 text-sm">
                Browse talents
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border/50 py-8">
        <div className="container-app flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-foreground-subtle">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-foreground/5 text-foreground">
              <span className="text-[9px] font-bold">P3</span>
            </div>
            <span>© {new Date().getFullYear()} Pow3Folio</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/talents" className="hover:text-foreground transition-colors">
              View talents
            </Link>
            <Link href="/signup" className="hover:text-foreground transition-colors">
              Get started
            </Link>
            <Link href="/login" className="hover:text-foreground transition-colors">
              Log in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
