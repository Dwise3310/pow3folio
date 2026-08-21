"use client";

import { useRef } from "react";

export type FeatureCard = {
  title: string;
  tag: string;
  desc: string;
  image: string;
  imageAlt: string;
};

const DEFAULT: FeatureCard[] = [
  {
    title: "Trading Record",
    tag: "PROOF",
    desc: "Live trades, ROI, charts and update threads. A track record teams can actually review.",
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Trading candlestick charts on a dark screen",
  },
  {
    title: "Onchain Stats",
    tag: "STATS",
    desc: "Chain-by-chain value, fees, last activity, contracts deployed and a 3-year heatmap viewers can tap.",
    image: "https://images.unsplash.com/photo-1639322537228-f710d846310a?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Blockchain network nodes and onchain analytics",
  },
  {
    title: "NFT import",
    tag: "COLLECT",
    desc: "Paste any marketplace URL. Ownership is checked onchain. Artwork is resolved through IPFS gateways.",
    image: "https://images.unsplash.com/photo-1620321023374-9dca1e2d11e6?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Digital collectible NFT artwork",
  },
  {
    title: "Multi-wallet",
    tag: "WALLETS",
    desc: "Connect extra wallets, name them, and let viewers switch tabs on the public onchain section.",
    image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Multiple payment cards and wallets",
  },
  {
    title: "Technical Writing",
    tag: "RESEARCH",
    desc: "Threads, Mirror posts and deep research that show how you think before you ship.",
    image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Notebook and writing tools on a desk",
  },
  {
    title: "Community Roles",
    tag: "SIGNAL",
    desc: "Mods, campaign leads, DAO work. Contributions with context, not empty titles.",
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Team collaborating around a laptop",
  },
  {
    title: "Airdrops & Testnets",
    tag: "ONCHAIN",
    desc: "Campaigns farmed, chains touched, status in one place builders respect.",
    image: "https://images.unsplash.com/photo-1642104704074-907c0698cbd9?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Network nodes visualization",
  },
  {
    title: "Skills as pillars",
    tag: "CRAFT",
    desc: "Service pillars with short proof-backed descriptions. Not random single word tags.",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Learning and skill building at a workspace",
  },
  {
    title: "Profile & Builder scores",
    tag: "TRUST",
    desc: "Strict public scores for completeness and evidence density. Hard to game, easy to read.",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Analytics dashboard with charts and metrics",
  },
  {
    title: "Private CV / PDF",
    tag: "RESUME",
    desc: "One click from the dashboard. Your profile becomes a professional two-column resume you can send. Visitors cannot download it.",
    image: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Clean resume document on a desk",
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
      <div className="mb-4 flex items-end justify-between gap-3 px-1">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-foreground-subtle">What Pow3Folio does</p>
          <h2 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight">Proof sections that move with you</h2>
        </div>
        <div className="flex gap-2 shrink-0">
          <button type="button" onClick={() => scrollBy(-1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground-muted hover:border-primary/40 hover:text-primary hover:shadow-glow-sm transition" aria-label="Scroll left">‹</button>
          <button type="button" onClick={() => scrollBy(1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground-muted hover:border-primary/40 hover:text-primary hover:shadow-glow-sm transition" aria-label="Scroll right">›</button>
        </div>
      </div>
      <div ref={ref} className="flex gap-3.5 overflow-x-auto pb-2 snap-x snap-mandatory" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {items.map((card) => (
          <article key={card.title} className="group relative h-64 w-[min(85vw,19rem)] shrink-0 snap-start overflow-hidden rounded-2xl border border-border/70 bg-zinc-900 shadow-sm transition duration-500 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={card.image} alt={card.imageAlt} className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-110" loading="lazy" decoding="async" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/20 transition duration-500 group-hover:from-black/80" />
            <div className="relative flex h-full flex-col justify-end p-4">
              <span className="mb-2 w-fit rounded-full border border-white/25 bg-black/45 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-white/95 backdrop-blur-sm transition group-hover:border-primary/50 group-hover:bg-primary/20">{card.tag}</span>
              <h3 className="text-lg font-bold text-white drop-shadow-md">{card.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-white/85">{card.desc}</p>
            </div>
          </article>
        ))}
      </div>
      <p className="mt-2.5 text-center text-[10px] text-foreground-subtle sm:hidden">Swipe sideways to explore</p>
    </div>
  );
}
