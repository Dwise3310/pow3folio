"use client";

import { useCallback, useEffect, useState } from "react";

type Props = {
  username: string;
  initialProfile: number;
  initialBuilder: number;
};

function Ring({
  value,
  label,
  accent,
}: {
  value: number;
  label: string;
  accent: string;
}) {
  const size = 56;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const offset = c - (pct / 100) * c;

  return (
    <div className="flex flex-col items-center gap-0.5" title={`${label} score`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={accent}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div
        className="pointer-events-none absolute flex flex-col items-center justify-center"
        style={{ width: size, height: size }}
      >
        <span className="text-[11px] font-bold tabular-nums leading-none text-foreground">
          {pct}%
        </span>
      </div>
      <span className="text-[9px] uppercase tracking-wide text-foreground-subtle">{label}</span>
    </div>
  );
}

export default function ScoreRings({ username, initialProfile, initialBuilder }: Props) {
  const [profile, setProfile] = useState(initialProfile);
  const [builder, setBuilder] = useState(initialBuilder);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/scores/${encodeURIComponent(username)}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data.profileScore === "number") setProfile(data.profileScore);
      if (typeof data.builderScore === "number") setBuilder(data.builderScore);
    } catch {
      /* ignore */
    }
  }, [username]);

  useEffect(() => {
    setProfile(initialProfile);
    setBuilder(initialBuilder);
  }, [initialProfile, initialBuilder]);

  useEffect(() => {
    const onFocus = () => refresh();
    const onSaved = () => refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("pow3:profile-saved", onSaved);
    const id = window.setInterval(refresh, 45_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pow3:profile-saved", onSaved);
      window.clearInterval(id);
    };
  }, [refresh]);

  return (
    <div className="flex items-start gap-3 shrink-0">
      <div className="relative">
        <Ring value={profile} label="Profile" accent="#a855f7" />
      </div>
      <div className="relative">
        <Ring value={builder} label="Builder" accent="#10b981" />
      </div>
    </div>
  );
}
