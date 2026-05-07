import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Tenki brand-tokens — speiler tenki.no
        "tenki-bg":       "#FAFAFA",
        "tenki-ink":      "#0F0F12",
        "tenki-accent":   "#1A4DFF",
        "tenki-muted":    "#6E6E76",
        "tenki-subtle":   "#E2E2E2",
        "tenki-surface":  "#F0F0F0",
        "tenki-hairline": "#D8D8D8",
        "tenki-good":     "#0F8F3C",
        "tenki-warn":     "#B65A0E",
        "tenki-bad":      "#B83A2A",
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "DM Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-dm-mono)", "DM Mono", "ui-monospace", "Cascadia Mono", "Consolas", "monospace"],
      },
      letterSpacing: {
        eyebrow: "0.18em",
        tight: "-0.02em",
        tighter: "-0.04em",
      },
      borderRadius: {
        none: "0",
      },
      animation: {
        "tenki-fade-up": "tenki-fade-up 1.1s cubic-bezier(0.22, 1, 0.36, 1) forwards",
      },
      keyframes: {
        "tenki-fade-up": {
          from: { opacity: "0", transform: "translateY(22px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
