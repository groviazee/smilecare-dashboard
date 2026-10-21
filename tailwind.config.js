/** @type {import('tailwindcss').Config} */
// "NEURAL HUD" theme — one dark, neon-on-void look for the whole dashboard.
// The stone/teal/red/amber/emerald/orange/indigo scales are REMAPPED here so every
// existing class in App.jsx (bg-stone-50, text-stone-900, bg-red-100, ...) picks up the
// futuristic palette without touching each component. Low numbers = dark surfaces,
// high numbers = bright text, so light-theme markup renders correctly on a dark UI.
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Exo 2"', "system-ui", "sans-serif"],
        display: ["Orbitron", '"Exo 2"', "sans-serif"],
      },
      colors: {
        panel: "#0b1330",
        stone: {
          50: "#04060f", 100: "#0b1330", 200: "#16224d", 300: "#243568", 400: "#7d8cc0",
          500: "#95a3d1", 600: "#b0bde4", 700: "#c9d4f3", 800: "#e2e9fd", 900: "#f3f7ff",
        },
        teal: {
          50: "#06222f", 100: "#08364a", 200: "#67e8f9", 300: "#4fe1fb", 400: "#2dd4f5",
          500: "#12bfe6", 600: "#0aa8cf", 700: "#22d3ee", 800: "#7be9fb", 900: "#cffafe",
        },
        red: {
          50: "#2a0a14", 100: "#3a0d1a", 200: "#5c1426", 300: "#8a1e38", 400: "#f26a86",
          500: "#ff3d6a", 600: "#ff5c80", 700: "#ff7d98", 800: "#ffa3b6", 900: "#ffc7d2",
        },
        amber: {
          50: "#2b1d05", 100: "#3d2a07", 200: "#5e4109", 300: "#8a5f0c", 400: "#ffc247",
          500: "#ffb020", 600: "#ffbf47", 700: "#ffcb6b", 800: "#ffd994", 900: "#ffe8bf",
        },
        emerald: {
          50: "#06241b", 100: "#08372a", 200: "#0e5a43", 300: "#14805d", 400: "#34f5c5",
          500: "#10e0a8", 600: "#2ef0bb", 700: "#5df5cd", 800: "#8ff8dc", 900: "#c4fcee",
        },
        orange: {
          50: "#2b1305", 100: "#3d1b07", 200: "#5e2b09", 300: "#8a400d", 400: "#ff9a4a",
          500: "#ff8420", 600: "#ff9a4d", 700: "#ffb073", 800: "#ffc79b", 900: "#ffdcc0",
        },
        indigo: {
          50: "#10113a", 100: "#171a52", 200: "#252a80", 300: "#3a42c0", 400: "#7b86ff",
          500: "#6366f1", 600: "#5a4bf0", 700: "#a9b1ff", 800: "#c3c8ff", 900: "#dde0ff",
        },
      },
      boxShadow: {
        neon: "0 0 22px -4px rgba(34,229,255,.55)",
      },
    },
  },
  plugins: [],
};
