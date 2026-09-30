import type { Config } from "tailwindcss";

// Color tokens are defined in app/globals.css.
// Colors are CSS variables (so light/dark swap at runtime). Routing them
// through color-mix with <alpha-value> keeps opacity modifiers like
// `bg-critical/10` working; with a bare var() Tailwind 3 silently drops them.
const withAlpha = (v: string) =>
  `color-mix(in srgb, var(${v}) calc(<alpha-value> * 100%), transparent)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: ["class"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'IBM Plex Sans'", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
      colors: {
        page: withAlpha("--page"),
        surface: withAlpha("--surface"),
        surface2: withAlpha("--surface-2"),
        ink: withAlpha("--ink"),
        ink2: withAlpha("--ink-2"),
        muted: withAlpha("--muted"),
        border: withAlpha("--border"),
        accent: withAlpha("--accent"),
        good: withAlpha("--good"),
        warn: withAlpha("--warn"),
        critical: withAlpha("--critical"),
        chart: withAlpha("--chart"),
        onaccent: withAlpha("--on-accent"),
        brand: withAlpha("--brand"),
        brand2: withAlpha("--brand-2"),
        onbrand: withAlpha("--on-brand"),
        onbrand2: withAlpha("--on-brand-2"),
        gold: withAlpha("--gold"),
        grid: withAlpha("--grid"),
        s1: withAlpha("--s1"),
        s2: withAlpha("--s2"),
        s3: withAlpha("--s3"),
        s4: withAlpha("--s4"),
        s5: withAlpha("--s5"),
        accentsoft: "var(--accent-soft)",
        up: withAlpha("--up"),
        down: withAlpha("--down"),
      },
    },
  },
  plugins: [],
};

export default config;
