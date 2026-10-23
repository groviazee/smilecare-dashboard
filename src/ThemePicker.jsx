import React, { useState, useEffect, useRef } from "react";
import { Palette, Check, Sparkles } from "lucide-react";
import { THEMES, getTheme, getMotion, applyTheme, applyMotion } from "./theme.js";

// Palette button for the header. Click → small popover with theme swatches and
// a "Motion" switch (turn animations off on slow devices / for calm mode).
export default function ThemePicker() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(getTheme);
  const [motion, setMotion] = useState(getMotion);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const pick = (id) => { applyTheme(id); setTheme(id); };
  const toggleMotion = () => { const next = !motion; applyMotion(next); setMotion(next); };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="p-1.5 rounded-lg hover:bg-teal-700" title="Change theme" aria-haspopup="true" aria-expanded={open}>
        <Palette size={16} />
      </button>
      {open && (
        <div role="menu" className="theme-pop absolute right-0 top-full mt-2 w-64 rounded-2xl border border-stone-200 bg-panel shadow-xl p-2 z-50 text-stone-900">
          <p className="px-2 pt-1 pb-2 text-[11px] font-semibold uppercase tracking-wider text-stone-500">Theme</p>
          {THEMES.map((t) => (
            <button key={t.id} role="menuitemradio" aria-checked={theme === t.id} onClick={() => pick(t.id)}
              className={`w-full flex items-center gap-3 px-2 py-2 rounded-xl text-left hover:bg-stone-100 ${theme === t.id ? "bg-stone-100" : ""}`}>
              <span className="h-8 w-8 rounded-lg shrink-0 ring-1 ring-black/10" style={{ background: `linear-gradient(135deg, ${t.swatch[0]}, ${t.swatch[1]})` }} />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold leading-tight">{t.name}</span>
                <span className="block text-[11px] text-stone-500 leading-tight">{t.mood}</span>
              </span>
              {theme === t.id && <Check size={15} className="text-teal-700" />}
            </button>
          ))}
          <div className="my-2 border-t border-stone-200" />
          <button role="menuitemcheckbox" aria-checked={motion} onClick={toggleMotion}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-stone-100 text-left">
            <Sparkles size={16} className="text-teal-700 shrink-0" />
            <span className="flex-1">
              <span className="block text-sm font-semibold leading-tight">Motion</span>
              <span className="block text-[11px] text-stone-500 leading-tight">{motion ? "Animations on" : "Calm mode — no animation"}</span>
            </span>
            <span className={`h-5 w-9 rounded-full p-0.5 transition ${motion ? "bg-teal-600" : "bg-stone-300"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${motion ? "translate-x-4" : ""}`} />
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
