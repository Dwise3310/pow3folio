"use client";

import ShareButton from "@/components/writing/ShareButton";
import type { CommunityItem } from "@/types/database";

type Props = {
  item: CommunityItem;
  profileUrl: string;
};

function dateLabel(start: string | null, end: string | null) {
  if (!start && !end) return null;
  if (start && !end) return `${start} – Present`;
  if (!start && end) return `Until ${end}`;
  return `${start} – ${end}`;
}

export default function CommunityCard({ item, profileUrl }: Props) {
  const period = dateLabel(item.started_at, item.ended_at);
  const shareUrl = item.url || profileUrl;
  const CardInner = (
    <>
      <div className="flex gap-3">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-elevated">
          {item.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-medium text-foreground-subtle">
              {(item.platform || item.title).slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-sm leading-snug break-words">{item.title}</h3>
          <p className="mt-0.5 text-xs text-foreground-muted">
            {[item.role, item.platform].filter(Boolean).join(" · ")}
          </p>
          {period && (
            <p className="mt-0.5 text-[11px] text-foreground-subtle">{period}</p>
          )}
        </div>
      </div>
      {item.description && (
        <p className="mt-2 text-xs text-foreground-muted line-clamp-3">{item.description}</p>
      )}
      {item.metrics && (
        <p className="mt-2 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
          {item.metrics}
        </p>
      )}
      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
        <div className="flex min-w-0 flex-wrap gap-1">
          {(item.tags ?? []).slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-surface-elevated px-1.5 py-0.5 text-[10px] text-foreground-subtle"
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
        className="card flex flex-col p-3 transition-all duration-200 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-md"
      >
        {CardInner}
      </a>
    );
  }

  return <article className="card flex flex-col p-3">{CardInner}</article>;
}
