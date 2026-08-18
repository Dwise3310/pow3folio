"use client";

import { useState, useRef } from "react";

type Props = {
  images: string[];
  className?: string;
  href?: string | null;
  hideEmpty?: boolean;
};

export default function TradeImageCarousel({ images, className = "", href, hideEmpty }: Props) {
  const valid = images.filter(Boolean);
  const [index, setIndex] = useState(0);
  const startX = useRef<number | null>(null);

  if (valid.length === 0) {
    if (hideEmpty) return null;
    return (
      <div
        className={`flex items-center justify-center bg-surface-elevated text-xs text-foreground-subtle ${className}`}
      >
        No chart
      </div>
    );
  }

  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (startX.current == null || valid.length < 2) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    if (dx < -40) setIndex((i) => Math.min(valid.length - 1, i + 1));
    if (dx > 40) setIndex((i) => Math.max(0, i - 1));
    startX.current = null;
  }

  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={valid[index]}
      alt=""
      className="h-full w-full object-cover select-none"
      draggable={false}
    />
  );

  return (
    <div
      className={`relative overflow-hidden bg-surface-elevated ${className}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="block h-full w-full">
          {img}
        </a>
      ) : (
        img
      )}

      {valid.length > 1 && (
        <>
          <div className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {valid.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${
                  i === index ? "bg-white" : "bg-white/40"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            className="absolute left-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/40 px-1.5 py-1 text-xs text-white opacity-80 hover:opacity-100"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIndex((i) => Math.max(0, i - 1));
            }}
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            type="button"
            className="absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/40 px-1.5 py-1 text-xs text-white opacity-80 hover:opacity-100"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIndex((i) => Math.min(valid.length - 1, i + 1));
            }}
            aria-label="Next"
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}
