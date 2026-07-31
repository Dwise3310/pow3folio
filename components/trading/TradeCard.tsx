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

function statusClass(status: string) {
  if (status === "win") return "text-success";
  if (status === "loss") return "text-danger";
  if (status === "breakeven") return "text-warning";
  return "text-foreground-muted";
}

export default function TradeCard({ trade, updates, profileUrl }: Props) {
  const [open, setOpen] = useState(false);
  const images = [trade.chart_url, trade.chart_url_2].filter(Boolean) as string[];
  const shareUrl = trade.post_url || profileUrl;
  const title = `${trade.ticker}${trade.pair ? ` ${trade.pair}` : ""} · ${trade.status}`;

  return (
    <>
      <article className="card flex flex-col overflow-hidden p-0 transition-colors hover:border-primary/40">
        <TradeImageCarousel images={images} className="aspect-[16/10] w-full" />

        <div className="flex flex-1 flex-col p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{trade.ticker}</h3>
            {trade.direction && (
              <span className="text-xs uppercase text-foreground-subtle">{trade.direction}</span>
            )}
            <span className={`text-xs font-semibold uppercase ${statusClass(trade.status)}`}>
              {trade.status}
            </span>
          </div>
          {trade.pair && <p className="text-sm text-foreground-muted">{trade.pair}</p>}
          {trade.roi != null && (
            <p className={`mt-1 text-sm font-medium ${statusClass(trade.status)}`}>
              {trade.roi > 0 ? "+" : ""}
              {trade.roi}%
            </p>
          )}
          {trade.analysis && (
            <p className="mt-2 text-sm text-foreground-muted line-clamp-3">{trade.analysis}</p>
          )}

          <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
            {trade.post_url ? (
              <a
                href={trade.post_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-xs"
              >
                View Post →
              </a>
            ) : (
              <span className="text-xs text-foreground-subtle">No post link</span>
            )}

            {updates.length > 0 ? (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="btn-ghost text-xs text-primary"
              >
                View Updates ({updates.length}) →
              </button>
            ) : (
              <span className="text-xs text-foreground-subtle">No updates yet</span>
            )}

            <div className="ml-auto">
              <ShareButton title={title} url={shareUrl} />
            </div>
          </div>

          {trade.traded_at && (
            <p className="mt-2 text-xs text-foreground-subtle">{trade.traded_at}</p>
          )}
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
