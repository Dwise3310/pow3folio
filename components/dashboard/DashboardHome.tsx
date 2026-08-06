"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
}[] = [
  {
    href: "/dashboard/profile",
    title: "Profile",
    hint: "Bio, skills, contacts, docs",
  },
  {
    href: "/dashboard/writing",
    title: "Writing",
    hint: "Articles & threads",
    flag: "show_writing",
  },
  {
    href: "/dashboard/trading",
    title: "Trading Record",
    hint: "Trades & analysis",
    flag: "show_trading",
  },
  {
    href: "/dashboard/community",
    title: "Community",
    hint: "Contributions",
    flag: "show_community",
  },
  {
    href: "/dashboard/airdrops",
    title: "Airdrops",
    hint: "Campaigns farmed",
    flag: "show_airdrops",
  },
  {
    href: "/dashboard/collectibles",
    title: "Onchain / NFTs",
    hint: "NFTs & wallet showcase",
    flag: "show_nfts",
  },
];

export default function DashboardHome({ userId, username, email, flags }: Props) {
  const router = useRouter();
  const [state, setState] = useState(flags);
  const [busy, setBusy] = useState<string | null>(null);

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
      alert(error.message.includes("column")
        ? "Run the profile section columns SQL in Supabase first."
        : error.message);
      return;
    }
    setState((s) => ({ ...s, [flag]: next }));
    router.refresh();
  }

  return (
    <main className="container-app py-6 sm:py-10">
      {username && (
        <div className="mb-6 rounded-xl border border-primary/25 bg-primary/5 p-4 sm:p-5">
          <p className="text-sm font-medium text-primary">
            Your custom link has been generated
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
          <Link
            href={`/${username}`}
            target="_blank"
            className="mt-3 inline-flex btn-secondary text-xs"
          >
            Open public profile
          </Link>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Manage proof of work. Use ON/OFF on each card to show or hide that tab on your public profile.
        </p>
        {email && (
          <p className="mt-1 text-xs text-foreground-subtle sm:hidden">{email}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {CARDS.map((card) => {
          const on = card.flag ? state[card.flag] : true;
          return (
            <div
              key={card.href}
              className="card relative flex flex-col p-3 sm:p-4 transition-colors hover:border-primary/40"
            >
              {card.flag && (
                <button
                  type="button"
                  disabled={busy === card.flag}
                  onClick={(e) => {
                    e.preventDefault();
                    toggle(card.flag!);
                  }}
                  className={`absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    on
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "bg-surface-elevated text-foreground-subtle border border-border"
                  }`}
                >
                  {busy === card.flag ? "…" : on ? "ON" : "OFF"}
                </button>
              )}
              <Link href={card.href} className="flex flex-1 flex-col pr-10">
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
