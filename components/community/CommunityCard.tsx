"use client";

import ShareButton from "@/components/writing/ShareButton";
import type { CommunityItem } from "@/types/database";

type Props = {
  item: CommunityItem;
  profileUrl: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  built: "Built by me",
  collaboration: "Collaboration",
  community: "Community role",
};

function resolveCategory(item: CommunityItem): string {
  const tags = item.tags ?? [];
  for (const t of tags) {
    const k = t.toLowerCase().trim();
    if (k === "built" || k === "built by me" || k === "personal project") return "built";
    if (k === "collaboration" || k === "collab" || k === "partner") return "collaboration";
    if (k === "community" || k === "community role" || k === "mod") return "community";
  }
  return "collaboration";
}

function dateLabel(start: string | null, end: string | null) {
  if (!start && !end) return null;
  if (start && !end) return `${start} – Present`;
  if (!start && end) return `Until ${end}`;
  return `${start} – ${end}`;
}

export default function CommunityCard({ item, profileUrl }: Props) {
  const period = dateLabel(item.started_at, item.ended_at);
  const shareUrl = item.url || profileUrl;
  const category = resolveCategory(item);
  const categoryLabel = CATEGORY_LABELS[category] || "Collaboration";
  const otherTags = (item.tags ?? []).filter((t) => {
    const k = t.toLowerCase().trim();
    return ![
      "built",
      "built by me",
      "personal project",
      "collaboration",
      "collab",
      "partner",
      "community",
      "community role",
      "mod",
    ].includes(k);
  });

  const CardInner = (
    <>
      <div className="flex items-start justify-between gap-1.5">
        <span className="inline-flex rounded-full border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
          {categoryLabel}
        </span>
      </div>
      <div className="mt-2 flex gap-2.5">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-elevated">
          {item.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] font-medium text-foreground-subtle">
              {(item.platform || item.title).slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-xs sm:text-sm leading-snug break-words line-clamp-2">{item.title}</h3>
          <p className="mt-0.5 text-[10px] sm:text-xs text-foreground-muted line-clamp-1">
            {[item.role, item.platform].filter(Boolean).join(" · ")}
          </p>
          {period && <p className="mt-0.5 text-[10px] text-foreground-subtle">{period}</p>}
        </div>
      </div>
      {item.description && (
        <p className="mt-2 text-[11px] text-foreground-muted line-clamp-2">{item.description}</p>
      )}
      {item.metrics && (
        <p className="mt-1.5 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary line-clamp-1">
          {item.metrics}
        </p>
      )}
      <div className="mt-2 flex items-center justify-between gap-1">
        <div className="flex min-w-0 flex-wrap gap-1">
          {otherTags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-surface-elevated px-1.5 py-0.5 text-[9px] text-foreground-subtle"
            >
              {tag}
            </span>
          ))}
        </div>
        <ShareButton title={item.title} url={shareUrl} />
      </div>
    </>
  );

  if (item.url) {
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="card h-auto self-start flex flex-col p-2.5 sm:p-3 transition-all duration-200 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-md"
      >
        {CardInner}
      </a>
    );
  }

  return (
    <article className="card h-auto self-start flex flex-col p-2.5 sm:p-3">{CardInner}</article>
  );
}
