"use client";

import ShareButton from "@/components/writing/ShareButton";
import type { Airdrop, AirdropStatus } from "@/types/database";

type Props = {
  item: Airdrop;
  profileUrl: string;
};

function statusClass(s: AirdropStatus) {
  switch (s) {
    case "claimed":
      return "bg-success/15 text-success";
    case "farming":
    case "qualified":
      return "bg-primary/15 text-primary";
    case "pending":
      return "bg-warning/15 text-warning";
    case "missed":
      return "bg-danger/15 text-danger";
    default:
      return "bg-surface-elevated text-foreground-muted";
  }
}

function statusLabel(s: AirdropStatus) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function AirdropCard({ item, profileUrl }: Props) {
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
              {(item.title || "AD").slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-sm leading-snug break-words">{item.title}</h3>
          <p className="mt-0.5 text-xs text-foreground-muted">
            {[item.chain, item.role].filter(Boolean).join(" · ")}
          </p>
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${statusClass(
              item.status
            )}`}
          >
            {statusLabel(item.status)}
          </span>
        </div>
      </div>
      {item.description && (
        <p className="mt-2 text-xs text-foreground-muted line-clamp-3">{item.description}</p>
      )}
      {item.reward && (
        <p className="mt-2 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
          {item.reward}
        </p>
      )}
      <div className="mt-2 flex items-center justify-between gap-2">
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
        className="card flex h-auto w-full flex-col p-3 transition-all duration-200 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-md"
      >
        {CardInner}
      </a>
    );
  }

  return <article className="card flex h-auto w-full flex-col p-3">{CardInner}</article>;
}
