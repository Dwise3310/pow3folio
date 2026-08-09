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
    title: "Writing",
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

          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            {user ? (
              <Link href="/dashboard" className="btn-primary text-xs sm:text-sm">
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="btn-ghost text-xs sm:text-sm hidden sm:inline-flex"
                >
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
        <section className="container-app flex flex-col items-center pt-16 pb-12 sm:pt-24 sm:pb-20 md:pt-28 text-center">
          <div className="landing-reveal mb-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-3.5 py-1.5 text-xs font-medium text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Built for Web3 builders & talents
          </div>

          <h1 className="landing-reveal landing-delay-1 max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl md:text-6xl leading-[1.1]">
            Your proof of work.{" "}
            <span className="bg-gradient-to-r from-primary via-emerald-400 to-accent bg-clip-text text-transparent">
              One clean link.
            </span>
          </h1>

          <p className="landing-reveal landing-delay-2 mt-5 sm:mt-6 max-w-2xl text-sm text-foreground-muted sm:text-lg px-1 leading-relaxed">
            Showcase trading records, writing, community work, airdrops and
            credentials. The professional identity layer crypto talents actually
            need, and teams can trust.
          </p>

          <div className="landing-reveal landing-delay-3 mt-8 sm:mt-10 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
            {user ? (
              <>
                <Link href="/dashboard" className="btn-primary px-6 py-3 text-base shadow-glow">
                  Go to dashboard
                </Link>
                <Link href="/talents" className="btn-secondary px-6 py-3 text-base">
                  View talents
                </Link>
              </>
            ) : (
              <>
                <Link href="/signup" className="btn-primary px-6 py-3 text-base shadow-glow">
                  Create your portfolio
                </Link>
                <Link href="/talents" className="btn-secondary px-6 py-3 text-base">
                  View talents
                </Link>
              </>
            )}
          </div>

          <p className="landing-reveal landing-delay-4 mt-4 text-xs text-foreground-subtle">
            Free to start · Public link in minutes · You control what is visible
          </p>

          <div className="landing-reveal landing-delay-5 mt-12 sm:mt-16 flex flex-wrap items-center justify-center gap-2 sm:gap-3 max-w-2xl">
            {["Traders", "Researchers", "Community leads", "Airdrop hunters", "Builders"].map(
              (label) => (
                <span
                  key={label}
                  className="rounded-full border border-border bg-surface/80 px-3 py-1 text-xs text-foreground-muted"
                >
                  {label}
                </span>
              )
            )}
          </div>
        </section>

        <section id="proof" className="container-app py-12 sm:py-16 md:py-20">
          <div className="mx-auto max-w-2xl text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Proof that hiring managers actually open
            </h2>
            <p className="mt-3 text-sm sm:text-base text-foreground-muted">
              Claims are cheap. Sections below are structured proof. Toggle any
              tab on or off on your public profile.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PROOF_SECTIONS.map((item, i) => (
              <div
                key={item.title}
                className="group card text-left transition-all duration-300 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-glow-sm"
                style={{ animationDelay: `${0.05 * i}s` }}
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-surface-elevated text-lg transition-transform duration-300 group-hover:scale-110">
                  {item.icon}
                </div>
                <h3 className="font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1.5 text-sm text-foreground-muted leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="border-y border-border/60 bg-surface/40 py-12 sm:py-16 md:py-20">
          <div className="container-app">
            <div className="mx-auto max-w-2xl text-center mb-10 sm:mb-14">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                How it works
              </h2>
              <p className="mt-3 text-sm sm:text-base text-foreground-muted">
                Three steps from zero to a shareable proof of work profile.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
              {STEPS.map((s) => (
                <div key={s.step} className="relative text-center md:text-left">
                  <div className="mx-auto md:mx-0 mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 font-mono text-sm font-bold text-primary">
                    {s.step}
                  </div>
                  <h3 className="text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-foreground-muted leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container-app py-12 sm:py-16 md:py-20">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 sm:p-10 md:p-12">
            <div
              className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-2xl"
              aria-hidden
            />
            <div className="relative grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-center">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-primary">
                  For teams & protocols
                </p>
                <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight">
                  Find talents with real proof, not just bios
                </h2>
                <p className="mt-3 text-sm sm:text-base text-foreground-muted leading-relaxed max-w-lg">
                  Browse featured builders by role and skills. Open public
                  profiles with trading records, writing, community work and
                  credentials in one place. No more scattered screenshots.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/talents" className="btn-primary px-5 py-2.5 shadow-glow-sm">
                    View talents
                  </Link>
                  {!user && (
                    <Link href="/signup" className="btn-secondary px-5 py-2.5">
                      List yourself as a talent
                    </Link>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { k: "Roles", v: "Trader, research, community" },
                  { k: "Proof tabs", v: "Visible on every profile" },
                  { k: "Open to work", v: "Filter ready builders" },
                  { k: "One link", v: "Share or bookmark profiles" },
                ].map((row) => (
                  <div
                    key={row.k}
                    className="rounded-xl border border-border bg-background/60 p-3 sm:p-4"
                  >
                    <p className="text-xs text-foreground-subtle">{row.k}</p>
                    <p className="mt-1 font-medium text-foreground text-xs sm:text-sm">
                      {row.v}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="container-app pb-16 sm:pb-24">
          <div className="mx-auto max-w-2xl rounded-2xl border border-primary/20 bg-primary/5 px-6 py-10 sm:px-10 sm:py-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Ready to show your work?
            </h2>
            <p className="mt-3 text-sm sm:text-base text-foreground-muted">
              Create your Pow3Folio in minutes. Share one link. Get found by the
              right teams.
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
