import React from "react";

// Live "vitals monitor" effects for the header. Pure decoration (aria-hidden,
// pointer-events none). All colours come from theme variables, all motion is
// CSS — so "Motion: off" in the theme picker silences everything.

// deterministic particle layout (no Math.random → no flicker on re-render)
const DOTS = Array.from({ length: 18 }, (_, i) => ({
  left: (i * 37 + 7) % 100,
  size: 2 + ((i * 7) % 4),
  dur: 8 + ((i * 5) % 9),
  delay: -((i * 3.7) % 13),
  dx: ((i * 13) % 34) - 17,
}));
const SPARKS = [
  { left: "22%", top: "26%", d: "0s" },
  { left: "63%", top: "16%", d: "1.7s" },
  { left: "86%", top: "58%", d: "3.1s" },
  { left: "41%", top: "70%", d: "4.4s" },
];

export function HeaderFX() {
  return (
    <div className="hfx" aria-hidden="true">
      {/* bright scan-head that sweeps along the ECG line */}
      <div className="hfx-glow"><div className="hfx-beam"><i /></div></div>
      {/* rising ion bubbles */}
      {DOTS.map((p, i) => (
        <b key={i} className="hfx-dot"
          style={{ left: `${p.left}%`, "--s": `${p.size}px`, "--d": `${p.dur}s`, "--dl": `${p.delay}s`, "--dx": `${p.dx}px` }} />
      ))}
      {/* dental sparkle glints */}
      {SPARKS.map((s, i) => (
        <span key={i} className="hfx-spark" style={{ left: s.left, top: s.top, "--dl": s.d }} />
      ))}
    </div>
  );
}

// Logo wrapper: icon does a "lub-dub" heartbeat, with two ripple rings.
export function LogoBeat({ children }) {
  return (
    <span className="logo-beat">
      <i /><i />
      <span className="logo-beat-icon">{children}</span>
    </span>
  );
}
