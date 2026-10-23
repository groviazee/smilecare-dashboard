// SmileCare theme engine — tiny, dependency-free.
// Sets <html data-theme="…"> and <html data-motion="on|off">, remembers the
// choice per browser, and feeds the cursor position to glass cards so the
// CSS spotlight can follow the mouse. Imported once from main.jsx.

export const THEMES = [
  { id: "ice",    name: "Ice",    mood: "Clean & clinical", swatch: ["#0b7a80", "#2fc7be"], meta: "#085e68" },
  { id: "aurora", name: "Aurora", mood: "Futuristic glow",  swatch: ["#6a46de", "#22d3ee"], meta: "#42289a" },
  { id: "pearl",  name: "Pearl",  mood: "Premium & warm",   swatch: ["#a37324", "#ecc4ba"], meta: "#3a2c1e" },
  { id: "lagoon", name: "Lagoon", mood: "Friendly blue",    swatch: ["#2266dc", "#38dbe8"], meta: "#184ea6" },
];

const THEME_KEY = "smilecare_theme";
const MOTION_KEY = "smilecare_motion";
const root = typeof document !== "undefined" ? document.documentElement : null;

function read(key, fallback) {
  try { return localStorage.getItem(key) || fallback; } catch (e) { return fallback; }
}
function write(key, val) {
  try { localStorage.setItem(key, val); } catch (e) { /* private mode — ignore */ }
}

export function getTheme() {
  const id = root?.getAttribute("data-theme");
  return THEMES.some((t) => t.id === id) ? id : "ice";
}
export function getMotion() { return root?.getAttribute("data-motion") !== "off"; }

export function applyTheme(id, { animate = true } = {}) {
  if (!root) return;
  const t = THEMES.find((x) => x.id === id) || THEMES[0];
  if (animate && getMotion()) {
    root.classList.add("theme-anim");
    clearTimeout(applyTheme._t);
    applyTheme._t = setTimeout(() => root.classList.remove("theme-anim"), 700);
  }
  root.setAttribute("data-theme", t.id);
  write(THEME_KEY, t.id);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", t.meta);
}

export function applyMotion(on) {
  if (!root) return;
  root.setAttribute("data-motion", on ? "on" : "off");
  write(MOTION_KEY, on ? "on" : "off");
}

function initTheme() {
  if (!root) return;
  const q = new URLSearchParams(location.search);          // ?theme=aurora  (handy for previews)
  applyTheme(q.get("theme") || read(THEME_KEY, "ice"), { animate: false });
  applyMotion(read(MOTION_KEY, "on") !== "off");

  // cursor-follow spotlight for .glass cards (mouse/pen only, rAF-throttled)
  let raf = 0;
  document.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    const card = e.target?.closest?.(".glass");
    if (!card) return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  }, { passive: true });
}

initTheme();
