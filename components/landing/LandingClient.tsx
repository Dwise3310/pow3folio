"use client";

import Link from "next/link";
import { motion, MotionConfig } from "framer-motion";
import {
  LineChart,
  Users,
  Link2,
  PenLine,
  Gift,
  ShieldCheck,
} from "lucide-react";
import ThemeToggle from "@/components/theme/ThemeToggle";
import ProofChain from "./ProofChain";

type Props = {
  isAuthed: boolean;
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12 },
  },
};

const features = [
  {
    icon: LineChart,
    title: "Trading Record",
    desc: "Win rate, ROI, charts and full trade timelines — not screenshots people have to trust blindly.",
  },
  {
    icon: Users,
    title: "Community Work",
    desc: "Roles, projects and contributions that matter, organized in one place instead of scattered across Discords.",
  },
  {
    icon: Link2,
    title: "On-chain Proof",
    desc: "Wallet age, activity and verifiable history — the receipts that back up what you say you've done.",
  },
  {
    icon: PenLine,
    title: "Writing",
    desc: "Threads, articles and research you've published, pulled into your record instead of lost in a feed.",
  },
  {
    icon: Gift,
    title: "Airdrops & Testnets",
    desc: "The programs you've farmed and tested, with what you actually contributed — not just a claim link.",
  },
  {
    icon: ShieldCheck,
    title: "Verified Identity",
    desc: "One credible link for teams, projects and collaborators to check before they bring you on.",
  },
];

const steps = [
  {
    n: "01",
    title: "Create your profile",
    desc: "Set up your Pow3Folio in minutes — handle, roles, socials and wallet.",
  },
  {
    n: "02",
    title: "Add your proof",
    desc: "Bring in trades, community roles, writing and airdrop work as you go.",
  },
  {
    n: "03",
    title: "Share one link",
    desc: "Send it instead of five different screenshots the next time someone asks what you've done.",
  },
];

export default function LandingClient({ isAuthed }: Props) {
  return (
    <MotionConfig reducedMotion="user">
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
            {isAuthed ? (
              <Link href="/dashboard" className="btn-primary text-xs sm:text-sm">
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="btn-ghost text-xs sm:text-sm hidden xs:inline-flex sm:inline-flex"
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
        {/* HERO */}
        <section className="container-app flex flex-col items-center py-16 sm:py-24 md:py-28 text-center">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-foreground-muted"
          >
            <span className="badge-open-dot bg-primary" />
            Built for Web3 professionals
          </motion.div>

          <motion.h1
            initial="hidden"
            animate="show"
            variants={stagger}
            className="max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl md:text-6xl"
          >
            <motion.span variants={fadeUp} transition={{ duration: 0.5 }} className="inline-block">
              Your proof of work.{" "}
            </motion.span>
            <motion.span
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="inline-block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
            >
              One clean link.
            </motion.span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="mt-6 max-w-xl text-sm text-foreground-muted sm:text-lg px-1"
          >
            Showcase trading records, community contributions, writing, airdrops
            and on-chain activity. The professional identity layer crypto
            actually needs.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-8 sm:mt-10 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center"
          >
            {isAuthed ? (
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
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.65 }}
            className="mt-16 sm:mt-20 w-full"
          >
            <ProofChain />
          </motion.div>
        </section>

        {/* FEATURES */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
          className="container-app py-16 sm:py-24"
        >
          <motion.div variants={fadeUp} transition={{ duration: 0.5 }} className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Everything that proves you did the work
            </h2>
            <p className="mt-3 text-sm text-foreground-muted sm:text-base">
              Six sections, one profile — built around what Web3 professionals
              actually have to show for their time.
            </p>
          </motion.div>

          <div className="mt-10 sm:mt-14 grid w-full gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                transition={{ duration: 0.45 }}
                whileHover={{ y: -4 }}
                className="card text-left transition-colors hover:border-primary/30 hover:shadow-glow-sm"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-4.5 w-4.5" size={18} />
                </div>
                <h3 className="mt-3 font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm text-foreground-muted">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* HOW IT WORKS */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
          className="container-app py-16 sm:py-24 border-t border-border/60"
        >
          <motion.div variants={fadeUp} transition={{ duration: 0.5 }} className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Live in three steps
            </h2>
          </motion.div>

          <div className="mt-10 sm:mt-14 grid gap-6 sm:gap-8 sm:grid-cols-3">
            {steps.map((s) => (
              <motion.div key={s.n} variants={fadeUp} transition={{ duration: 0.45 }} className="text-left">
                <span className="text-sm font-mono font-semibold text-primary">{s.n}</span>
                <h3 className="mt-2 font-semibold text-foreground">{s.title}</h3>
                <p className="mt-2 text-sm text-foreground-muted">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* CTA */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5 }}
          className="container-app pb-20 sm:pb-28"
        >
          <div className="card-elevated relative overflow-hidden text-center px-6 py-14 sm:py-20">
            <div
              className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-[0.1]"
              style={{ backgroundSize: "40px 40px" }}
            />
            <div className="relative">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Stop screenshotting your track record.
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-foreground-muted sm:text-base">
                Build your Pow3Folio once, then share the one link every time.
              </p>
              <div className="mt-8 flex justify-center">
                {isAuthed ? (
                  <Link href="/dashboard" className="btn-primary px-6 py-3 text-base">
                    Go to dashboard
                  </Link>
                ) : (
                  <Link href="/signup" className="btn-primary px-6 py-3 text-base">
                    Create your portfolio
                  </Link>
                )}
              </div>
            </div>
          </div>
        </motion.section>
      </main>

      <footer className="relative z-10 border-t border-border/60 py-8">
        <div className="container-app text-center text-sm text-foreground-subtle">
          © {new Date().getFullYear()} Pow3Folio. Built for the Web3 generation.
        </div>
      </footer>
    </div>
    </MotionConfig>
  );
}
