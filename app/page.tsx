import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ThemeToggle from "@/components/theme/ThemeToggle";

const PROOF_SECTIONS = [
  {
    title: "Trading Record",
    desc: "Trades, ROI, charts and timelines. A real track record, not screenshots in a chat.",
    icon: "📈",
  },
  {
    title: "Technical Writing / Research",
    desc: "Threads, Mirror posts and research. Show how you think, not just what you claim.",
    icon: "✍️",
  },
  {
    title: "Community",
    desc: "Roles, campaigns and contributions teams can actually verify.",
    icon: "🌐",
  },
  {
    title: "Airdrops & Testnets",
    desc: "Campaigns farmed, chains touched, status tracked in one place.",
    icon: "🪂",
  },
  {
    title: "Docs & Credentials",
    desc: "CV, certificates and proof files under your About, owned by you.",
    icon: "📄",
  },
  {
    title: "On chain",
    desc: "Wallet, ENS and NFTs on your public profile when you choose to show them.",
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
      {/* Background */}
      <div
        className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-[0.12] dark:opacity-[0.18]"
        style={{ backgroundSize: "48px 48px" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-32 left-1/2 h-[28rem] w-[40rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl dark:bg-primary/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute top-[40%] right-0 h-64 w-64 rounded-full bg-accent/10 blur-3xl"
        aria-hidden
      />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="container-app flex h-14 sm:h-16 items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary shadow-glow-sm">
              <span className="text-sm font-bold">P3</span>
            </div>
            <span className="text-base sm:text-lg font-semibold tracking-tight truncate">
              Pow<span className="text-primary">3</span>Folio
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm">
            <a href="#proof" className="btn-ghost text-xs sm:text-sm">
              Proof
            </a>
            <a href="#how" className="btn-ghost text-xs sm:text-sm">
              How it works
            </a>
            <Link href="/talents" className="btn-ghost text-xs sm:text-sm">
              View talents
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <Link href="/dashboard" className="btn-primary text-xs sm:text-sm px-3 py-1.5">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn-ghost text-xs sm:text-sm hidden sm:inline-flex">
                  Log in
                </Link>
                <Link href="/signup" className="btn-primary text-xs sm:text-sm px-3 py-1.5">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="container-app pt-12 pb-16 sm:pt-20 sm:pb-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="animate-fade-up text-xs sm:text-sm font-medium uppercase tracking-widest text-primary">
              Web3 proof of work
            </p>
            <h1 className="animate-fade-up delay-100 mt-3 text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.15]">
              Your on chain track record,{" "}
              <span className="text-primary">finally in one place</span>
            </h1>
            <p className="animate-fade-up delay-200 mt-5 text-base sm:text-lg text-foreground-muted max-w-2xl mx-auto leading-relaxed">
              Pow3Folio is the public portfolio for crypto traders, researchers, community builders and airdrop hunters. Show real trades, writing, contributions and credentials so teams can trust you without the fluff.
            </p>
            <div className="animate-fade-up delay-300 mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              {user ? (
                <Link href="/dashboard" className="btn-primary px-6 py-3 text-base shadow-glow">
                  Open dashboard
                </Link>
              ) : (
                <Link href="/signup" className="btn-primary px-6 py-3 text-base shadow-glow">
                  Create your profile
                </Link>
              )}
              <Link href="/talents" className="btn-secondary px-6 py-3 text-base">
                View talents
              </Link>
            </div>
          </div>
        </section>

        {/* Proof sections */}
        <section id="proof" className="container-app pb-16 sm:pb-24">
          <div className="mx-auto max-w-2xl text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Everything that proves you</h2>
            <p className="mt-3 text-sm sm:text-base text-foreground-muted">
              Toggle what stays public. Keep the rest private. One clean profile that updates with you.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PROOF_SECTIONS.map((s, i) => (
              <div
                key={s.title}
                className={`card p-5 animate-fade-up delay-${(i + 1) * 100}`}
              >
                <div className="text-2xl mb-3">{s.icon}</div>
                <h3 className="font-semibold text-base">{s.title}</h3>
                <p className="mt-1.5 text-sm text-foreground-muted leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="container-app pb-16 sm:pb-24">
          <div className="mx-auto max-w-2xl text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">How it works</h2>
            <p className="mt-3 text-sm sm:text-base text-foreground-muted">
              Three steps. No fluff. Built for people who actually ship.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {STEPS.map((s) => (
              <div key={s.step} className="relative text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary font-bold text-sm">
                  {s.step}
                </div>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-foreground-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* For teams */}
        <section className="container-app pb-16 sm:pb-24">
          <div className="rounded-2xl border border-border bg-surface-elevated/50 p-6 sm:p-10">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-primary">For teams</p>
                <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight">
                  Hire builders with real proof
                </h2>
                <p className="mt-3 text-sm sm:text-base text-foreground-muted leading-relaxed">
                  Stop guessing from Telegram screenshots. Browse verified trading records, research, community roles and on chain activity. Find the right talent faster.
                </p>
                <Link href="/talents" className="btn-primary mt-6 inline-flex">
                  Browse talents
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { k: "Track record", v: "Live trades & ROI" },
                  { k: "Research", v: "Writing you can read" },
                  { k: "Community", v: "Roles you can verify" },
                  { k: "On chain", v: "Wallet & NFTs" },
                ].map((row) => (
                  <div key={row.k} className="rounded-xl border border-border bg-background/60 p-4">
                    <p className="text-xs text-foreground-subtle">{row.k}</p>
                    <p className="mt-1 text-sm font-medium">{row.v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="container-app pb-16 sm:pb-24">
          <div className="mx-auto max-w-2xl rounded-2xl border border-primary/20 bg-primary/5 px-6 py-10 sm:px-10 sm:py-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Ready to show your work?
            </h2>
            <p className="mt-3 text-sm sm:text-base text-foreground-muted">
              Create your Pow3Folio in minutes. Share one link. Get found by the right teams.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              {user ? (
                <Link href="/dashboard" className="btn-primary px-6 py-3 text-base shadow-glow">
                  Open dashboard
                </Link>
              ) : (
                <Link href="/signup" className="btn-primary px-6 py-3 text-base shadow-glow">
                  Get started free
                </Link>
              )}
              <Link href="/talents" className="btn-secondary px-6 py-3 text-base">
                Browse talents
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border/60 py-10">
        <div className="container-app flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-foreground-subtle">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-primary">
              <span className="text-[10px] font-bold">P3</span>
            </div>
            <span>
              © {new Date().getFullYear()} Pow3Folio · Built for Web3 talents
            </span>
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
