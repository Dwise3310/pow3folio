"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import OnboardingTour, { resetOnboarding } from "@/components/onboarding/OnboardingTour";
import DashboardAutofill from "@/components/dashboard/DashboardAutofill";
import { loadPendingAutofill, type AutofillSection } from "@/lib/autofill-store";

type SectionKey =
  | "show_writing"
  | "show_trading"
  | "show_community"
  | "show_airdrops"
  | "show_nfts"
  | "show_credentials";

type Props = {
  userId: string;
  username: string | null;
  email: string | null;
  flags: Record<SectionKey, boolean>;
};

const CARDS: {
  href: string;
  title: string;
  hint: string;
  flag?: SectionKey;
  autofill?: AutofillSection;
}[] = [
  {
    href: "/dashboard/profile",
    title: "Profile",
    hint: "Bio, skills, work, education, links",
    autofill: "profile",
  },
  {
    href: "/dashboard/community",
    title: "Projects / Collab",
    hint: "Builds, partnerships, community roles",
    flag: "show_community",
    autofill: "community",
  },
  {
    href: "/dashboard/writing",
    title: "Technical Writing",
    hint: "Articles, threads, research",
    flag: "show_writing",
    autofill: "writing",
  },
  {
    href: "/dashboard/trading",
    title: "Trading Record",
    hint: "Trades, platforms, updates",
    flag: "show_trading",
  },
  {
    href: "/dashboard/collectibles",
    title: "Onchain / NFTs",
    hint: "Wallet showcase and NFTs",
    flag: "show_nfts",
  },
  {
    href: "/dashboard/airdrops",
    title: "Airdrops",
    hint: "Optional. Off by default on public profile",
    flag: "show_airdrops",
  },
];

export default function DashboardHome({ userId, username, email, flags }: Props) {
  const router = useRouter();
  const [state, setState] = useState(flags);
  const [busy, setBusy] = useState<string | null>(null);
  const [tourKey, setTourKey] = useState(0);
  const [pendingSections, setPendingSections] = useState<AutofillSection[]>([]);

  useEffect(() => {
    const p = loadPendingAutofill();
    setPendingSections(p?.pending ?? []);
    function onPending(ev: Event) {
      const detail = (ev as CustomEvent).detail;
      setPendingSections(detail?.pending ?? []);
    }
    window.addEventListener("pow3-pending-autofill", onPending);
    return () => window.removeEventListener("pow3-pending-autofill", onPending);
  }, []);

  async function toggle(flag: SectionKey) {
    setBusy(flag);
    const next = !state[flag];
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ [flag]: next })
      .eq("id", userId);
    setBusy(null);
    if (error) {
      alert(
        error.message.includes("column")
          ? "Run the profile section columns SQL in Supabase first."
          : error.message
      );
      return;
    }
    setState((s) => ({ ...s, [flag]: next }));
    router.refresh();
  }

  return (
    <main className="container-app py-6 sm:py-10">
      <OnboardingTour key={tourKey} />

      {username ? (
        <div className="mb-6 rounded-xl border border-border bg-surface/80 p-4 sm:p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-foreground-subtle">
            Public link
          </p>
          <p className="mt-1 text-sm text-foreground-muted break-all">
            <Link
              href={`/${username}`}
              className="text-primary hover:underline font-medium"
              target="_blank"
            >
              pow3folio.vercel.app/{username}
            </Link>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={`/${username}`} target="_blank" className="btn-secondary text-xs">
              Open public profile
            </Link>
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() => {
                resetOnboarding();
                setTourKey((k) => k + 1);
              }}
            >
              Replay setup tour
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-sm font-medium">Set a username to unlock your public URL</p>
          <p className="mt-1 text-xs text-foreground-muted">
            Open Profile, choose a unique username, then Save.
          </p>
          <Link href="/dashboard/profile" className="btn-primary mt-3 inline-flex text-xs">
            Complete profile
          </Link>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-foreground-muted max-w-xl">
          Manage proof of work. ON/OFF on each card shows or hides that tab on your public profile.
        </p>
        {email && (
          <p className="mt-1 text-xs text-foreground-subtle sm:hidden">{email}</p>
        )}
      </div>

      <DashboardAutofill />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {CARDS.map((card) => {
          const on = card.flag ? state[card.flag] : true;
          const needsReview =
            !!card.autofill && pendingSections.includes(card.autofill);
          return (
            <div
              key={card.href}
              className={`card relative flex flex-col p-3.5 sm:p-4 transition-colors hover:border-primary/40 ${
                needsReview
                  ? "ring-2 ring-amber-400/80 border-amber-400/50 shadow-[0_0_0_1px_rgba(251,191,36,0.25)]"
                  : ""
              }`}
            >
              {needsReview && (
                <span className="absolute top-2 left-2 rounded-full bg-amber-400/20 border border-amber-400/40 px-2 py-0.5 text-[10px] font-semibold text-amber-500">
                  Review autofill
                </span>
              )}
              {card.flag && (
                <button
                  type="button"
                  disabled={busy === card.flag}
                  onClick={(e) => {
                    e.preventDefault();
                    toggle(card.flag!);
                  }}
                  className={`absolute top-2.5 right-2.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    on
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "bg-surface-elevated text-foreground-subtle border border-border"
                  }`}
                >
                  {busy === card.flag ? "…" : on ? "ON" : "OFF"}
                </button>
              )}
              <Link
                href={card.href}
                className={`flex flex-1 flex-col pr-12 ${
                  needsReview ? "pt-5" : ""
                }`}
              >
                <h3 className="font-medium text-sm sm:text-base">{card.title}</h3>
                <p className="mt-1 text-[11px] sm:text-xs text-foreground-muted line-clamp-2">
                  {card.hint}
                </p>
                <p className="mt-auto pt-3 text-xs text-primary">Manage →</p>
              </Link>
            </div>
          );
        })}
      </div>
    </main>
  );
}
