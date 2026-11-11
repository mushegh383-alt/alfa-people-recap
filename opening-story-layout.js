export const storyTravel = 18.2;
export const storyAnchors = { '#intro': 0, '#your-year': 1.8, '#thanks': 3.28, '#postcards': 5.5, '#moments': 7.45, '#income': 9.65, '#alfa-ai': 11.6, '#ai-agent': 13.1, '#talk-time': 15.5, '#top-contact':17.8 };
const clamp = x => Math.max(0, Math.min(1, x));
export const storyPhase = (u, a, b) => {
  const p = clamp((u - a) / (b - a));
  return p * p * (3 - 2 * p);
};

export function openingStoryFrame(scrollUnits, reduced = false) {
  const u = Math.max(0, Math.min(storyTravel, scrollUnits));
  const first = storyPhase(u, .3, 1.1);
  const second = storyPhase(u, 1.95, 2.65);
  const heroScale = reduced ? 1 : 1 - first * .28;
  return {
    hero: 1 - storyPhase(u, .42, .98),
    heroScale,
    heroFilmScale: 1 / heroScale,
    heroDecor: reduced ? 0 : first,
    personal: storyPhase(u, .55, 1.05) * (1 - storyPhase(u, 2.1, 2.65)),
    personalScale: reduced ? 1 : .82 + .18 * first - .14 * second,
    personalPhoto: storyPhase(u, .55, 1.08),
    personalName: storyPhase(u, .82, 1.2),
    personalCount: storyPhase(u, 1.02, 1.45),
    personalCaption: storyPhase(u, 1.26, 1.65),
    dark: storyPhase(u, .5, 1.1),
    thanks: storyPhase(u, 2.12, 2.65) * (1 - storyPhase(u, 3.55, 4.1)),
    heart: storyPhase(u, 2.12, 2.65),
    thanksStats: storyPhase(u, 2.55, 3.1),
    thanksNote: storyPhase(u, 2.8, 3.2),
    thanksExit: storyPhase(u, 3.55, 4.1),
    postcards: storyPhase(u, 3.65, 4.1) * (1 - storyPhase(u, 5.7, 6.2)),
    postcardsProgress: clamp((u - 3.8) / 1.85),
    moments: storyPhase(u, 5.78, 6.28) * (1 - storyPhase(u, 7.55, 8.08)),
    momentsProgress: clamp((u - 5.9) / 2.18),
    income: storyPhase(u, 7.65, 8.12) * (1 - storyPhase(u, 10.1, 10.85)),
    planet: storyPhase(u, 10.1, 10.85)*(1-storyPhase(u,17,17.15)),
    planetExit:storyPhase(u,15.65,16.95),
    contact:storyPhase(u,15.65,15.9),
    contactProgress:clamp((u-15.85)/1.95),
    incomeProgress: clamp((u - 7.8) / 1.85),
    incomeExit: storyPhase(u, 10.05, 10.85),
  };
}

export function storyDigits(value, progress, start, end) {
  const digits = String(value);
  return [...digits].map((digit, i) => {
    const settle = start + (end - start) * (i + 1) / digits.length;
    if (progress >= settle) return digit;
    const tick = Math.floor(clamp((progress - start + .25) / (settle - start + .25)) * 23);
    return String((Number(digit) + 4 + i + tick) % 10);
  }).join('');
}

export function storyUnit(scroll, top, viewport) {
  return Math.max(0, Math.min(storyTravel, (scroll - top) / Math.max(1, viewport)));
}

// Scene-to-scene "focus pull": the outgoing chapter drifts toward the viewer and
// goes out of focus while the next one settles in from slightly further away.
// Ranges mirror the crossfades above so opacity and depth always move together.
// Hero→personal and income→planet→contact keep their bespoke handoffs.
const depthRanges = {
  personal: [null, [2.1, 2.65]],
  thanks: [[2.12, 2.65], [3.55, 4.1]],
  postcards: [[3.65, 4.1], [5.7, 6.2]],
  moments: [[5.78, 6.28], [7.55, 8.08]],
  income: [[7.65, 8.12], null],
};
export function sceneDepth(u) {
  const out = {};
  for (const [key, [enter, exit]] of Object.entries(depthRanges)) {
    const inP = enter ? storyPhase(u, ...enter) : 1;
    const outP = exit ? storyPhase(u, ...exit) : 0;
    out[key] = { scale: (1 - (1 - inP) * .07) * (1 + outP * .09), blur: (1 - inP) * 9 + outP * 12, dim: 1 - outP * .4, lift: outP * -2.5 + (1 - inP) * 2 };
  }
  return out;
}
