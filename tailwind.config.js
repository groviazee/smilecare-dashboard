/** @type {import('tailwindcss').Config} */
// "Cleanroom" theme: every neutral (stone) and brand (teal) shade is a CSS
// variable declared in src/index.css, so the whole app re-themes — light and
// dark — without touching each className. Alpha modifiers (bg-teal-500/20)
// keep working through the <alpha-value> placeholder.
const scale = (name) =>
  Object.fromEntries(
    [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((n) => [
      n,
      `rgb(var(--${name}-${n}) / <alpha-value>)`,
    ])
  );

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        stone: scale("n"),
        teal: scale("t"),
        panel: "rgb(var(--panel) / <alpha-value>)",
        canvas: "rgb(var(--canvas) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["Figtree", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        display: ["Sora", "Figtree", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "0.625rem",
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        sm: "0 1px 2px rgb(var(--glow) / 0.06), inset 0 1px 0 rgb(var(--hi))",
        DEFAULT: "0 2px 10px rgb(var(--glow) / 0.10), inset 0 1px 0 rgb(var(--hi))",
        md: "0 6px 20px rgb(var(--glow) / 0.12), inset 0 1px 0 rgb(var(--hi))",
        lg: "0 12px 34px rgb(var(--glow) / 0.16), inset 0 1px 0 rgb(var(--hi))",
        xl: "0 18px 50px rgb(var(--glow) / 0.20)",
        "2xl": "0 28px 70px rgb(var(--glow) / 0.26)",
      },
    },
  },
  plugins: [],
};
