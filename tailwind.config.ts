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
        bg: "#FAFAFA",
        ink: "#0F0F12",
        accent: "#1A4DFF",
        muted: "#6E6E76",
        subtle: "#E2E2E2",
        surface: "#F0F0F0",
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        mono: ["DM Mono", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        eyebrow: "0.18em",
        tight: "-0.02em",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
