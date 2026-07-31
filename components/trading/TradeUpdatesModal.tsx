"use client";

import { useEffect } from "react";
import type { Trade, TradeUpdate } from "@/types/database";

type Props = {
  trade: Trade;
  updates: TradeUpdate[];
  open: boolean;
  onClose: () => void;
};

function statusClass(status: string) {
  if (status === "win") return "text-success";
  if (status === "loss") return "text-danger";
  if (status === "breakeven") return "text-warning";
  return "text-foreground-muted";
}

export default function TradeUpdatesModal({ trade, updates, open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const sorted = [...updates].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-h-[90vh] w-full max-w-[580px] overflow-y-auto rounded-t-2xl border border-border bg-surface sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-surface px-4 py-3">
          <div className="min-w-0">
            <h2 className="font-semibold truncate">
              {trade.ticker}
              {trade.pair ? ` · ${trade.pair}` : ""}
            </h2>
            <div className="mt-1 flex flex-wrap gap-2 text-xs">
              {trade.direction && (
                <span className="uppercase text-foreground-subtle">{trade.direction}</span>
              )}
              <span className={`font-semibold uppercase ${statusClass(trade.status)}`}>
                {trade.status}
              </span>
              {trade.roi != null && (
                <span className={statusClass(trade.status)}>
                  {trade.roi > 0 ? "+" : ""}
                  {trade.roi}%
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost h-9 w-9 shrink-0 p-0 text-lg"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="space-y-0 p-4">
          {/* Original call */}
          <TimelineItem
            label="Original Call"
            date={trade.traded_at || trade.created_at?.slice(0, 10)}
            chartUrl={trade.chart_url}
            chartUrl2={trade.chart_url_2}
            caption={trade.analysis}
            postUrl={trade.post_url}
          />

          {sorted.map((u, i) => (
            <div key={u.id}>
              <div className="flex items-center justify-center py-3">
                <span className="text-xs font-medium text-foreground-subtle">
                  ↓ {u.label || `Update ${i + 1}`}
                </span>
              </div>
              <TimelineItem
                label={u.label || `Update ${i + 1}`}
                date={u.created_at?.slice(0, 10)}
                chartUrl={u.chart_url}
                caption={u.caption}
                postUrl={u.post_url}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TimelineItem({
  label,
  date,
  chartUrl,
  chartUrl2,
  caption,
  postUrl,
}: {
  label: string;
  date?: string | null;
  chartUrl?: string | null;
  chartUrl2?: string | null;
  caption?: string | null;
  postUrl?: string | null;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-primary">{label}</span>
        {date && <span className="text-xs text-foreground-subtle">{date}</span>}
      </div>
      {(chartUrl || chartUrl2) && (
        <div className="mb-2 space-y-2">
          {chartUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={chartUrl} alt="" className="w-full rounded-lg object-cover" />
          )}
          {chartUrl2 && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={chartUrl2} alt="" className="w-full rounded-lg object-cover" />
          )}
        </div>
      )}
      {caption && (
        <p className="text-sm text-foreground-muted whitespace-pre-wrap">{caption}</p>
      )}
      {postUrl && (
        <a
          href={postUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center rounded-lg border border-accent/40 px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent/10"
        >
          View on X →
        </a>
      )}
    </div>
  );
}
