import { ease, clamp } from './november-layout.js';
export const momentsCenter = { x: 988, y: 1390 };

// Пружинка с перелётом: 0 → ~1.1 → 1.
export const backOut = t => { const c1 = 1.70158, c3 = c1 + 1, x = clamp(t) - 1; return 1 + c3 * x * x * x + c1 * x * x; };

// Полароиды «влетают» из-за краёв экрана: откуда и с каким закрутом.
export const photoThrow = [
  { dx: -1100, dy: -700, spin: -80 },
  { dx: 1200, dy: 300, spin: 95 },
  { dx: -900, dy: 900, spin: 70 },
];

export const sparkleCount = 10;

export function momentsFrame(progress, reduced = false) {
  const p = reduced ? 1 : clamp(progress);
  const growth = [0, 1, 2].map(i => reduced ? .35 : ease(.23 + i * .045, .94 + i * .025, p));
  const photos = [0, 1, 2].map(i => reduced ? 1 : clamp((p - (.05 + i * .05)) / .17));
  const land = photos.map(t => reduced ? 1 : backOut(t));
  // Звезда выстреливает из точки с перелётом и докручивается.
  const popT = reduced ? 1 : clamp(p / .24), pop = reduced ? 1 : backOut(popT), spinLeft = (1 - popT) * (1 - popT);
  const numberPop = reduced ? 1 : backOut(clamp((p - .1) / .2));
  return {
    zoom: reduced ? 1 : (1.12 - .12 * ease(0, .75, p)) * (.3 + .7 * pop),
    backRotation: reduced ? 0 : -6 + 12 * ease(0, 1, p) - 75 * spinLeft,
    coreRotation: reduced ? 0 : 3 - 6 * ease(0, 1, p) + 100 * spinLeft,
    info: reduced ? 1 : ease(.08, .3, p),
    numberPop,
    digits: reduced ? 1 : ease(.13, .52, p),
    // Вспышка фотоаппарата в момент появления сцены.
    flash: reduced ? 0 : ease(-.04, .02, p) * (1 - ease(.03, .17, p)),
    sparkles: reduced ? 0 : ease(.02, .34, p),
    photos, land, growth,
    photoScale: photos.map((reveal, i) => .72 + .28 * Math.min(1, reveal) + growth[i] * (i === 2 ? 1.12 : 1.0)),
  };
}
