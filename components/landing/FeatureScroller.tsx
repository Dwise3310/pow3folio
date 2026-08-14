"use client";

import { useRef } from "react";

export type FeatureCard = {
  title: string;
  tag: string;
  desc: string;
  gradient: string;
};

const DEFAULT: FeatureCard[] = [
  {
    title: "Trading Record",
    tag: "PROOF",
    desc: "Live trades, ROI, charts and update threads. A track record teams can actually review.",
    gradient: "from-emerald-600/40 via-teal-900/30 to-zinc-900",
  },
  {
    title: "Technical Writing",
    tag: "RESEARCH",
    desc: "Threads, Mirror posts and deep research that show how you think before you ship.",
    gradient: "from-sky-600/40 via-indigo-900/30 to-zinc-900",
  },
  {
    title: "Community Roles",
    tag: "SIGNAL",
    desc: "Mods, campaign leads, DAO work. Contributions with context, not empty titles.",
    gradient: "from-violet-600/40 via-purple-900/30 to-zinc-900",
  },
  {
    title: "Airdrops & Testnets",
    tag: "ONCHAIN",
    desc: "Campaigns farmed, chains touched, status in one place builders respect.",
    gradient: "from-amber-600/35 via-orange-900/25 to-zinc-900",
  },
  {
    title: "Skills as pillars",
    tag: "CRAFT",
    desc: "Service pillars with short proof-backed descriptions. Not random single word tags.",
    gradient: "from-rose-600/35 via-pink-900/25 to-zinc-900",
  },
  {
    title: "Profile & Builder scores",
    tag: "TRUST",
    desc: "Strict public scores for completeness and evidence density. Hard to game, easy to read.",
    gradient: "from-cyan-600/35 via-slate-900/40 to-zinc-900",
  },
];

export default function FeatureScroller({ items = DEFAULT }: { items?: FeatureCard[] }) {
  const ref = useRef<HTMLDivElement>(null);

  function scrollBy(dir: number) {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(320, el.clientWidth * 0.8), behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div className="mb-3 flex items-end justify-between gap-3 px-1">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-foreground-subtle">
            What Pow3Folio does
          </p>
          <h2 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight">
            Proof sections that move with you
          </h2>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground-muted hover:border-primary/40 hover:text-primary transition"
            aria-label="Scroll left"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground-muted hover:border-primary/40 hover:text-primary transition"
            aria-label="Scroll right"
          >
            ›
          </button>
        </div>
      </div>

      <div
        ref={ref}
        className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {items.map((card) => (
          <article
            key={card.title}
            className="group relative h-56 w-[min(85vw,18rem)] shrink-0 snap-start overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-sm transition duration-300 hover:border-primary/35 hover:shadow-lg hover:shadow-primary/5"
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-90 transition duration-500 group-hover:scale-105`}
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_45%)]" />
            <div className="relative flex h-full flex-col justify-end p-4">
              <span className="mb-2 w-fit rounded-full border border-white/15 bg-black/25 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white/90 backdrop-blur-sm">
                {card.tag}
              </span>
              <h3 className="text-lg font-bold text-white drop-shadow-sm">{card.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-white/80">{card.desc}</p>
            </div>
          </article>
        ))}
      </div>
      <p className="mt-2 text-center text-[10px] text-foreground-subtle sm:hidden">
        Swipe sideways to explore
      </p>
    </div>
  );
}
