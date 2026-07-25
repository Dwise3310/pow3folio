import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Core surfaces
        background: "#09090b",
        surface: {
          DEFAULT: "#18181b",
          elevated: "#27272a",
          hover: "#3f3f46",
        },
        border: {
          DEFAULT: "#27272a",
          strong: "#3f3f46",
        },
        // Brand / Proof accent (Emerald = credibility & growth)
        primary: {
          DEFAULT: "#10b981",
          hover: "#059669",
          muted: "#064e3b",
          foreground: "#ecfdf5",
        },
        // Secondary accent
        accent: {
          DEFAULT: "#22d3ee",
          muted: "#083344",
        },
        // Text
        foreground: {
          DEFAULT: "#fafafa",
          muted: "#a1a1aa",
          subtle: "#71717a",
        },
        // Semantic
        success: "#22c55e",
        warning: "#f59e0b",
        danger: "#ef4444",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px -5px rgba(16, 185, 129, 0.25)",
        "glow-sm": "0 0 12px -3px rgba(16, 185, 129, 0.2)",
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(to right, #27272a 1px, transparent 1px), linear-gradient(to bottom, #27272a 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};

export default config;
