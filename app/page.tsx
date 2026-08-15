import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ThemeToggle from "@/components/theme/ThemeToggle";
import FeatureScroller from "@/components/landing/FeatureScroller";

const STEPS = [
  {
    step: "01",
    title: "Create your profile",
    desc: "Username, bio, skills, wallet. One clean public URL that is yours.",
  },
  {
    step: "02",
    title: "Add proof of work",
    desc: "Trading, writing, community, airdrops, docs. Toggle what the world sees.",
  },
  {
    step: "03",
    title: "Raise your scores",
    desc: "Profile Score and Builder Score update as you fill real evidence. No fluff.",
  },
  {
    step: "04",
    title: "Get discovered",
    desc: "Share your link or show up in View talents when teams search for builders like you.",
  },
];

const STATS = [
  { label: "Proof tabs", value: "6" },
  { label: "Public scores", value: "2" },
  { label: "AI assistant", value: "Live" },
  { label: "Talent discovery", value: "Open" },
];

const ROLES = [
  "Traders",
  "Researchers",
  "Community Leads",
  "Airdrop Hunters",
  "Builders",
  "Mods",
  "Onchain Analysts",
  "Campaign Managers",
];

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Ambient grid + orbs */}
      <div
        className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-[0.07] dark:opacity-[0.12]"
        style={{ backgroundSize: "40px 40px" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[32rem] w-[48rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl glow-orb"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute top-[32%] -right-24 h-72 w-72 rounded-full bg-sky-500/15 blur-3xl float-y"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-[8%] -left-20 h-64 w-64 rounded-full bg-violet-500/12 blur-3xl float-y-slow"
        aria-hidden
      />

      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="container-app flex h-14 items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 min-w-0 group">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary transition group-hover:bg-primary/25 group-hover:shadow-glow-sm">
              <span className="text-xs font-bold">P3</span>
            </div>
            <span className="text-sm sm:text-base font-semibold tracking-tight truncate">
              Pow<span className="text-primary">3</span>Folio
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-0.5 text-sm">
            <a href="#features" className="btn-ghost text-xs">
              Features
            </a>
            <a href="#how" className="btn-ghost text-xs">
              How it works
            </a>
            <Link href="/talents" className="btn-ghost text-xs">
              View talents
            </Link>
            <Link href="/faq" className="btn-ghost text-xs">
              FAQ
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
                <Link href="/signup" className="btn-primary text-xs px-3 py-1.5 cta-pulse">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* HERO */}
        <section className="container-app pt-14 pb-10 sm:pt-24 sm:pb-14">
          <div className="mx-auto max-w-3xl text-center">
            <div className="landing-reveal landing-delay-1 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-3.5 py-1.5 text-[11px] text-foreground-muted backdrop-blur-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              Live scores · real proof · talent discovery
            </div>

            <h1 className="landing-reveal landing-delay-2 mt-6 text-3xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight leading-[1.08]">
              Your Web3 work.{" "}
              <span className="hero-gradient-text">Verified. Visible. Hireable.</span>
            </h1>

            <p className="landing-reveal landing-delay-3 mt-5 text-sm sm:text-base text-foreground-muted max-w-2xl mx-auto leading-relaxed">
              Stop scattering trades, threads and roles across ten apps.
              One sleek public profile with strict scores teams actually trust.
              Built for people who ship, not just claim.
            </p>

            <div className="landing-reveal landing-delay-4 mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              {user ? (
                <Link
                  href="/dashboard"
                  className="btn-primary px-7 py-3 text-sm shadow-lg shadow-primary/25 cta-pulse"
                >
                  Open dashboard
                </Link>
              ) : (
                <Link
                  href="/signup"
                  className="btn-primary px-7 py-3 text-sm shadow-lg shadow-primary/25 cta-pulse"
                >
                  Create free profile →
                </Link>
              )}
              <Link href="/talents" className="btn-secondary px-7 py-3 text-sm">
                Browse talents
              </Link>
            </div>

            <div className="landing-reveal landing-delay-5 mt-12 grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-xl mx-auto">
              {STATS.map((s, i) => (
                <div
                  key={s.label}
                  className="stat-pop glass-panel rounded-xl px-3 py-3.5 transition duration-300 hover:border-primary/40 hover:shadow-glow-sm hover:-translate-y-0.5"
                  style={{ animationDelay: `${0.35 + i * 0.08}s` }}
                >
                  <p className="text-lg sm:text-xl font-bold tracking-tight text-primary">{s.value}</p>
                  <p className="text-[10px] text-foreground-subtle mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ROLE MARQUEE */}
        <div className="marquee-wrap landing-reveal landing-delay-6 mb-10 border-y border-border/40 bg-surface/40">
          <div className="marquee-track">
            {[...ROLES, ...ROLES].map((role, i) => (
              <span key={`${role}-${i}`} className="marquee-item flex items-center gap-2">
                <span className="text-primary">◆</span> {role}
              </span>
            ))}
          </div>
        </div>

        {/* FEATURES */}
        <section id="features" className="pb-14 sm:pb-18">
          <div className="container-app">
            <FeatureScroller />
          </div>
        </section>

        {/* WHY */}
        <section className="container-app pb-14 sm:pb-16">
          <div className="shine-border rounded-2xl glass-panel p-5 sm:p-8">
            <p className="text-[11px] font-medium uppercase tracking-widest text-foreground-subtle">
              Why this exists
            </p>
            <h2 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight max-w-xl">
              Your work is real. Most profiles still look like claims.
            </h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                {
                  t: "Scattered proof",
                  d: "Trades on one app, threads on X, roles in Discord. Recruiters will not dig.",
                },
                {
                  t: "Soft resumes",
                  d: "Buzzwords without charts, links or campaign history fail in Web3 hiring.",
                },
                {
                  t: "Hard to discover",
                  d: "Great builders stay invisible without a public, searchable proof profile.",
                },
              ].map((x) => (
                <div
                  key={x.t}
                  className="rounded-xl border border-border/80 bg-background/60 p-4 transition duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md"
                >
                  <h3 className="text-sm font-semibold">{x.t}</h3>
                  <p className="mt-1.5 text-xs text-foreground-muted leading-relaxed">{x.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW */}
        <section id="how" className="container-app pb-14 sm:pb-16">
          <div className="mx-auto max-w-xl text-center mb-8">
            <p className="text-[11px] font-medium uppercase tracking-widest text-foreground-subtle">
              How it works
            </p>
            <h2 className="mt-1.5 text-xl sm:text-2xl font-bold tracking-tight">
              Four steps. Built for people who ship.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {STEPS.map((s, i) => (
              <div
                key={s.step}
                className="relative rounded-2xl border border-border/80 bg-surface/60 p-4 transition duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-bold">
                  {s.step}
                </div>
                <h3 className="mt-3 font-semibold text-sm">{s.title}</h3>
                <p className="mt-1.5 text-xs text-foreground-muted leading-relaxed">{s.desc}</p>
                {i < STEPS.length - 1 && (
                  <span
                    className="hidden lg:block absolute top-8 -right-2 text-foreground-subtle text-lg"
                    aria-hidden
                  >
                    →
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* TEAMS */}
        <section className="container-app pb-14 sm:pb-16">
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-surface via-surface to-primary/8 p-5 sm:p-8">
            <div className="grid gap-6 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-foreground-subtle">
                  For teams
                </p>
                <h2 className="mt-1.5 text-xl sm:text-2xl font-bold tracking-tight">
                  Hire builders with real proof
                </h2>
                <p className="mt-2 text-sm text-foreground-muted leading-relaxed">
                  Browse trading records, research, community roles and onchain activity.
                  Filter open-to-work talent. Skip the noise.
                </p>
                <Link href="/talents" className="btn-primary mt-5 inline-flex text-sm">
                  Browse talents
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { k: "Track record", v: "Trades & ROI" },
                  { k: "Research", v: "Writing you can read" },
                  { k: "Community", v: "Roles you can verify" },
                  { k: "Scores", v: "Profile + Builder" },
                ].map((row) => (
                  <div
                    key={row.k}
                    className="rounded-xl border border-border/80 bg-background/80 p-3 transition duration-300 hover:border-primary/30 hover:-translate-y-0.5"
                  >
                    <p className="text-[11px] text-foreground-subtle">{row.k}</p>
                    <p className="mt-0.5 text-sm font-medium">{row.v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="container-app pb-16 sm:pb-24">
          <div className="relative mx-auto max-w-2xl overflow-hidden rounded-2xl border border-primary/30 bg-surface/80 px-5 py-12 sm:px-10 text-center shine-border">
            <div
              className="pointer-events-none absolute -top-12 left-1/2 h-40 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl glow-orb"
              aria-hidden
            />
            <h2 className="relative text-xl sm:text-2xl font-bold tracking-tight">
              Ready to get discovered?
            </h2>
            <p className="relative mt-2 text-sm text-foreground-muted">
              Create your Pow3Folio in minutes. One link. Real scores. Real opportunities.
            </p>
            <div className="relative mt-7 flex flex-col sm:flex-row gap-3 justify-center">
              {user ? (
                <Link href="/dashboard" className="btn-primary px-7 py-3 text-sm cta-pulse">
                  Open dashboard
                </Link>
              ) : (
                <Link href="/signup" className="btn-primary px-7 py-3 text-sm cta-pulse">
                  Get started free →
                </Link>
              )}
              <Link href="/talents" className="btn-secondary px-7 py-3 text-sm">
                Browse talents
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border/40 py-8">
        <div className="container-app flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-foreground-subtle">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/15 text-primary">
              <span className="text-[9px] font-bold">P3</span>
            </div>
            <span>© {new Date().getFullYear()} Pow3Folio</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/talents" className="hover:text-foreground transition-colors">
              View talents
            </Link>
            <Link href="/faq" className="hover:text-foreground transition-colors">
              FAQ
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
