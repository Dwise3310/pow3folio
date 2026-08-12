"use client";

import { useState } from "react";
import type { Trade, TradeUpdate } from "@/types/database";
import TradeImageCarousel from "@/components/trading/TradeImageCarousel";
import TradeUpdatesModal from "@/components/trading/TradeUpdatesModal";
import ShareButton from "@/components/writing/ShareButton";

type Props = {
  trade: Trade;
  updates: TradeUpdate[];
  profileUrl: string;
};

function statusBadge(status: string) {
  if (status === "win") return "bg-success/15 text-success border-success/30";
  if (status === "loss") return "bg-danger/15 text-danger border-danger/30";
  if (status === "breakeven") return "bg-warning/15 text-warning border-warning/30";
  return "bg-accent/15 text-accent border-accent/30"; // open
}

function directionBadge(direction: string | null) {
  if (direction === "long") return "bg-success/10 text-success border-success/25";
  if (direction === "short") return "bg-danger/10 text-danger border-danger/25";
  if (direction === "spot") return "bg-primary/10 text-primary border-primary/25";
  return "bg-surface-elevated text-foreground-muted border-border";
}

function roiBadge(roi: number) {
  if (roi > 0) return "bg-success/15 text-success border-success/30";
  if (roi < 0) return "bg-danger/15 text-danger border-danger/30";
  return "bg-warning/15 text-warning border-warning/30";
}

export default function TradeCard({ trade, updates, profileUrl }: Props) {
  const [open, setOpen] = useState(false);
  const images = [trade.chart_url, trade.chart_url_2].filter(Boolean) as string[];
  const shareUrl = trade.post_url || profileUrl;
  const title = `${trade.ticker}${trade.pair ? ` ${trade.pair}` : ""} · ${trade.status}`;
  const post = trade.post_url;

  const titleBlock = (
    <>
      <span className="text-sm font-semibold leading-tight text-primary">
        {trade.ticker}
      </span>
      {trade.pair && (
        <span className="text-xs leading-tight text-foreground-muted">{trade.pair}</span>
      )}
    </>
  );

  return (
    <>
      <article className="card flex flex-col overflow-hidden p-0 transition-colors hover:border-primary/40">
        <TradeImageCarousel
          images={images}
          className="aspect-[16/10] w-full"
          href={post}
        />

        <div className="flex flex-1 flex-col gap-1.5 p-3">
          {/* Title hyperlinked to original post like writings */}
          {post ? (
            <a
              href={post}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 hover:underline"
            >
              {titleBlock}
            </a>
          ) : (
            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">{titleBlock}</div>
          )}

          {/* Colored badges: direction / status / ROI */}
          <div className="flex flex-wrap items-center gap-1">
            {trade.direction && (
              <span
                className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none ${directionBadge(
                  trade.direction
                )}`}
              >
                {trade.direction}
              </span>
            )}
            <span
              className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none ${statusBadge(
                trade.status
              )}`}
            >
              {trade.status}
            </span>
            {trade.roi != null && (
              <span
                className={`rounded border px-1.5 py-0.5 text-[10px] font-bold leading-none ${roiBadge(
                  trade.roi
                )}`}
              >
                {trade.roi > 0 ? "+" : ""}
                {trade.roi}%
              </span>
            )}
          </div>

          {trade.analysis && (
            post ? (
              <a
                href={post}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs leading-snug text-foreground-muted line-clamp-2 hover:text-foreground"
              >
                {trade.analysis}
              </a>
            ) : (
              <p className="text-xs leading-snug text-foreground-muted line-clamp-2">
                {trade.analysis}
              </p>
            )
          )}

          <div className="mt-auto flex flex-wrap items-center gap-x-2.5 gap-y-1 pt-1.5">
            {post && (
              <a
                href={post}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-primary hover:underline"
              >
                View Post →
              </a>
            )}

            {updates.length > 0 ? (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="text-xs font-medium text-accent hover:underline"
              >
                Updates ({updates.length}) →
              </button>
            ) : (
              <span className="text-[11px] text-foreground-subtle">No updates</span>
            )}

            <div className="ml-auto flex items-center gap-2">
              {trade.traded_at && (
                <span className="text-[11px] text-foreground-subtle">{trade.traded_at}</span>
              )}
              <ShareButton title={title} url={shareUrl} />
            </div>
          </div>
        </div>
      </article>

      <TradeUpdatesModal
        trade={trade}
        updates={updates}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
