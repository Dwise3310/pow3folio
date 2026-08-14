"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type TalentCard = {
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  open_to_work: boolean;
  skills: { name: string; description?: string }[];
  location: string | null;
  is_featured: boolean;
  role_hint: string | null;
};

const ROLE_PRESETS = [
  "All roles",
  "Trader",
  "Researcher",
  "Community",
  "Moderator",
  "Developer",
  "Analyst",
  "Airdrop",
  "Content",
  "BD",
];

type Props = {
  talents: TalentCard[];
};

export default function TalentsDiscovery({ talents }: Props) {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("All roles");
  const [openOnly, setOpenOnly] = useState(false);
  const [featuredOnly, setFeaturedOnly] = useState(false);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return talents.filter((t) => {
      if (openOnly && !t.open_to_work) return false;
      if (featuredOnly && !t.is_featured) return false;

      if (role !== "All roles") {
        const blob = [
          t.role_hint,
          t.bio,
          ...t.skills.map((s) => s.name),
          ...t.skills.map((s) => s.description || ""),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!blob.includes(role.toLowerCase())) return false;
      }

      if (!query) return true;
      const hay = [
        t.display_name,
        t.username,
        t.bio,
        t.location,
        t.role_hint,
        ...t.skills.map((s) => s.name),
        ...t.skills.map((s) => s.description || ""),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(query);
    });
  }, [talents, q, role, openOnly, featuredOnly]);

  return (
    <div className="space-y-5">
      {/* Search + filters */}
      <div className="space-y-3">
        <div className="relative">
          <input
            className="input pl-10 text-sm"
            placeholder="Search by name, skill, role, location…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search talents"
          />
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle text-sm">
            ⌕
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            className="input w-auto min-w-[8.5rem] text-xs py-2"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            aria-label="Filter by role"
          >
            {ROLE_PRESETS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setOpenOnly((v) => !v)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              openOnly
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-surface text-foreground-muted hover:border-border-strong"
            }`}
          >
            Open to work
          </button>

          <button
            type="button"
            onClick={() => setFeaturedOnly((v) => !v)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              featuredOnly
                ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "border-border bg-surface text-foreground-muted hover:border-border-strong"
            }`}
          >
            Featured
          </button>

          <span className="ml-auto text-xs text-foreground-subtle">
            {filtered.length} talent{filtered.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card py-10 text-center">
          <p className="text-sm text-foreground-muted">No talents match these filters.</p>
          <button
            type="button"
            className="btn-ghost mt-3 text-sm"
            onClick={() => {
              setQ("");
              setRole("All roles");
              setOpenOnly(false);
              setFeaturedOnly(false);
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <Link
              key={t.username}
              href={`/${t.username}`}
              className="card group relative flex flex-col p-3.5 transition-all duration-200 hover:border-primary/35 hover:-translate-y-0.5 hover:shadow-md"
            >
              {t.is_featured && (
                <span className="absolute right-3 top-3 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                  Featured
                </span>
              )}

              <div className="flex items-start gap-3">
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-border bg-surface-elevated">
                  {t.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-foreground-subtle">
                      {(t.display_name || t.username).charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 pr-14">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                      {t.display_name || t.username}
                    </p>
                    {t.open_to_work && (
                      <span className="badge-open text-[10px]">
                        <span className="badge-open-dot" aria-hidden />
                        Open
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-foreground-subtle truncate">@{t.username}</p>
                  {t.role_hint && (
                    <p className="mt-0.5 text-[11px] text-foreground-muted truncate">{t.role_hint}</p>
                  )}
                </div>
              </div>

              {t.bio && (
                <p className="mt-2.5 text-xs text-foreground-muted line-clamp-2 leading-relaxed">
                  {t.bio}
                </p>
              )}

              {t.location && (
                <p className="mt-2 flex items-center gap-1 text-[11px] text-foreground-subtle">
                  <span className="location-dot" aria-hidden />
                  {t.location}
                </p>
              )}

              {t.skills.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {t.skills.slice(0, 4).map((s) => (
                    <span
                      key={s.name}
                      className="rounded-full border border-border bg-surface-elevated px-2 py-0.5 text-[10px] text-foreground-muted"
                    >
                      {s.name}
                    </span>
                  ))}
                </div>
              )}

              <p className="mt-auto pt-2.5 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                View profile →
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
