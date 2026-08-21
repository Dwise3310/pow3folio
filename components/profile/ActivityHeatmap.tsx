"use client";

import { useMemo, useState } from "react";

function monthsBack(count: number) {
  const now = new Date();
  const out: { key: string; label: string; year: number; month: number }[] = [];
  for (let i = 0; i < count; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString(undefined, { month: "long", year: "numeric" }),
      year: d.getFullYear(),
      month: d.getMonth(),
    });
  }
  return out;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export default function ActivityHeatmap({ days }: { days: string[] }) {
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const day of days) {
      const key = day.slice(0, 10);
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [days]);
  const slides = useMemo(() => monthsBack(36), []);
  const [idx, setIdx] = useState(0);
  const slide = slides[idx];
  const totalDays = daysInMonth(slide.year, slide.month);
  const startWeekday = new Date(slide.year, slide.month, 1).getDay();
  const cells: (string | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: totalDays }, (_, i) => {
      const day = String(i + 1).padStart(2, "0");
      return `${slide.key}-${day}`;
    }),
  ];

  function tone(key: string | null) {
    if (!key) return "bg-transparent";
    const n = counts.get(key) || 0;
    if (n === 0) return "bg-surface-elevated";
    if (n === 1) return "bg-primary/25";
    if (n < 4) return "bg-primary/50";
    return "bg-primary";
  }

  return (
    <div className="card p-3 sm:p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="section-heading mb-0">Activity heatmap</h3>
          <p className="mt-1 text-[11px] text-foreground-subtle">{slide.label} · last 3 years</p>
        </div>
        <div className="flex gap-1">
          <button type="button" className="btn-ghost h-8 w-8 p-0 text-sm" disabled={idx >= slides.length - 1} onClick={() => setIdx((v) => Math.min(slides.length - 1, v + 1))}>
            ‹
          </button>
          <button type="button" className="btn-ghost h-8 w-8 p-0 text-sm" disabled={idx <= 0} onClick={() => setIdx((v) => Math.max(0, v - 1))}>
            ›
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={`${d}-${i}`} className="text-center text-[9px] uppercase text-foreground-subtle">
            {d}
          </div>
        ))}
        {cells.map((key, i) => (
          <div
            key={key || `empty-${i}`}
            title={key ? `${key} · ${counts.get(key) || 0} txs` : undefined}
            className={`h-3.5 rounded-[3px] ${tone(key)}`}
          />
        ))}
      </div>
      <p className="text-[10px] text-foreground-subtle">Darker cells mean more transactions that day. Swipe months with the arrows.</p>
    </div>
  );
}
