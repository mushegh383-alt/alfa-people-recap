import { fitScale } from './layout-fit.js';
const clamp = x => Math.max(0, Math.min(1, x));
const smooth = x => { const t = clamp(x); return t * t * (3 - 2 * t); };
const phase = (p, a, b) => smooth((p - a) / (b - a));

export function incomeGlassPose(progress, reduced = false) {
  const p = reduced ? 1 : clamp(progress);
  const pullback = phase(p, 0, .64);
  return {
    zoom: 1 + 3.8 * (1 - pullback) ** 2,
    turn: -.94 * (1 - pullback) + .085 * Math.sin(p * Math.PI),
    title: phase(p, .06, .34),
    cap: phase(p, .28, .58),
    number: phase(p, 0, .46),
    caption: phase(p, .58, .82),
    rank: phase(p, .68, .86),
    light: p,
  };
}

// Deterministic digit reels: scrolling backwards rewinds them too.
export function incomeGlassDigits(value, progress) {
  const digits = String(value);
  return [...digits].map((digit, i) => {
    const stop = .58 + .18 * (i + 1) / digits.length;
    if (progress >= stop) return digit;
    const ticks = Math.floor(clamp(progress / stop) * 29);
    return String((Number(digit) + 4 + i + ticks) % 10);
  }).join('');
}

export function incomeGlassProgress(scroll, top, height, viewport) {
  return clamp((scroll - top + viewport * .16) / Math.max(1, height - viewport + viewport * .16));
}

export function incomeGlassHandoff(scroll, top, viewport, reduced = false) {
  const distance = Math.max(1, viewport);
  const shade = smooth((scroll - top + distance * .85) / (distance * 1.10));
  const orb = reduced ? 1 : smooth((scroll - top + distance * .30) / (distance * .75));
  return { shade, red: 1 - shade, orb };
}

export function incomeGlassGeometry(width, height) {
  const scale = fitScale(width, height, 1920, 1690, 'income', 24, 32);
  const x = (width - 1754 * scale) / 2;
  const y = (height - 1644 * scale) / 2;
  return { scale, x: x + 878.5 * scale, y: y + 952.5 * scale, radius: 695.5 * scale };
}

// Both renderers use this same screen-space circle while the ornament changes
// into the first, stationary frame of the planet film.
export function incomePlanetHandoff(width, height, units) {
  const g = incomeGlassGeometry(width, height);
  const p = phase(units, 10.05, 10.85);
  return {
    x: g.x + (width * .5 - g.x) * p,
    y: g.y + (height * .52 - g.y) * p,
    radius: g.radius + (Math.min(width * .23, height * .33) - g.radius) * p,
  };
}
