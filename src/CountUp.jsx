import React, { useEffect, useRef, useState } from "react";

// Animates a number from its previous value to the new one (easeOutCubic).
// Accepts numbers or strings like "12%" / "₹4,500" — the non-numeric part is
// kept as-is. Falls back to plain text if motion is off / reduced.
const NUM = /^(\D*?)(-?\d[\d,]*(?:\.\d+)?)(.*)$/;

export default function CountUp({ value, duration = 800 }) {
  const str = String(value ?? "");
  const m = str.match(NUM);
  const target = m ? parseFloat(m[2].replace(/,/g, "")) : null;
  const decimals = m && m[2].includes(".") ? m[2].split(".")[1].length : 0;
  const useCommas = !!m && m[2].includes(",");
  const [shown, setShown] = useState(target === null ? null : 0);
  const from = useRef(0);

  useEffect(() => {
    if (target === null) return undefined;
    const off = document.documentElement.getAttribute("data-motion") === "off"
      || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (off) { setShown(target); from.current = target; return undefined; }
    const start = performance.now();
    const begin = from.current;
    let raf = 0;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(begin + (target - begin) * eased);
      if (p < 1) raf = requestAnimationFrame(tick); else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  if (target === null) return <>{str}</>;
  const n = shown ?? 0;
  const txt = n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: useCommas });
  return <>{m[1]}{txt}{m[3]}</>;
}
