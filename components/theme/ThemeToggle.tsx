"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("pow3folio-theme") as "dark" | "light" | null;
    const preferred =
      stored ||
      (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    setTheme(preferred);
    document.documentElement.classList.toggle("dark", preferred === "dark");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("pow3folio-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  if (!mounted) {
    return (
      <button type="button" className="btn-ghost h-9 w-9 p-0" aria-label="Toggle theme">
        <span className="text-base">◑</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="btn-ghost h-9 w-9 p-0"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      <span className="text-base leading-none">{theme === "dark" ? "☀️" : "🌙"}</span>
    </button>
  );
}
