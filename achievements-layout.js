// Original Figma frame 2861:123 and the sixteen contour-aligned SVG layers.
export const achievementsFrame = { width: 1920, height: 1084, originX: 982, originY: 561, perspectiveTop: -406, perspectiveHeight: 1944 };
export const achievementEdges = [
  { left: 0, top: -58.17, width: 3525.38, height: 3074.87 },
  { left: 0, top: -58.17, width: 3525.38, height: 3074.87 },
  { left: 0, top: -81.9, width: 2389.95, height: 3536.05 },
  { left: 0, top: -81.9, width: 2389.95, height: 3536.05 },
  { left: -24.98, top: -81.9, width: 2399.54, height: 3536.05 },
  { left: -24.98, top: -81.9, width: 2399.54, height: 3536.05 },
  { left: -83.63, top: -58.17, width: 3525.61, height: 3074.87 },
  { left: -83.63, top: -58.17, width: 3525.61, height: 3074.87 },
  { left: -83.63, top: 0, width: 3525.61, height: 3072.19 },
  { left: -83.63, top: 0, width: 3525.61, height: 3072.19 },
  { left: -24.98, top: 0, width: 2399.54, height: 3536.05 },
  { left: -24.98, top: 0, width: 2399.54, height: 3536.05 },
  { left: 0, top: 0, width: 2390.17, height: 3536.05 },
  { left: 0, top: 0, width: 2390.17, height: 3536.05 },
  { left: 0, top: 0, width: 3525.61, height: 3072.19 },
  { left: 0, top: 0, width: 3525.61, height: 3072.19 },
];

const clamp = value => Math.max(0, Math.min(1, value));

// Общий масштаб сцены для звезды и лучей. «ачивки» стоит над рамкой макета
// (top −40), поэтому на широком экране вписываем по высоте всю фигуру с надписью
// (~1330 px макета). Лучи масштабируются так же — тёмный вырез в их центре
// остаётся ровным контуром вокруг звезды.
export function achievementsSceneScale(width, height, fit) {
  return width / Math.max(1, height) < .8 ? fit : Math.min(fit, height / 1330);
}
// Figma's exported contour is counterclockwise. Start above the star and reverse it.
export const achievementClockwiseOrder = [3, 2, 1, 0, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4];
const clockwiseRank = Object.fromEntries(achievementClockwiseOrder.map((index, rank) => [index, rank]));
export function achievementRayReveal(progress, index) {
  // Each complete ray moves out from the vanishing point, in clockwise order.
  const local = clamp((clamp(progress) * 17 - clockwiseRank[index]) / 2);
  return { scale: local * local * (3 - 2 * local), complete: local === 1 };
}

export function achievementTransition(sectionTop, viewportHeight) {
  const reveal = (start, end) => {
    const t = clamp((viewportHeight * start - sectionTop) / (viewportHeight * (start - end)));
    return t * t * (3 - 2 * t);
  };
  return { star: reveal(.92, .18), cards: reveal(.65, .15) };
}

export function achievementsScrollProgress(sectionTop, sectionHeight, viewportHeight) {
  const start = viewportHeight * .88;
  const end = viewportHeight - sectionHeight;
  return sectionTop <= end + 1 ? 1 : clamp((start - sectionTop) / (start - end));
}

export function achievementPlayback(sectionTop, sectionHeight, viewportHeight, hasCoins, portrait = false, readingTravel = 0) {
  const opening = achievementsScrollProgress(sectionTop, hasCoins ? viewportHeight * 1.5 : sectionHeight, viewportHeight);
  const time = -sectionTop / viewportHeight - readingTravel;
  // In portrait the next scene slides up beneath the departing star.
  const t = hasCoins ? (portrait ? clamp((time - .65) / .72) : clamp((time - .80) / .55)) : 0;
  const closing = t * t * (3 - 2 * t);
  // Уход больше не перематывает открытие назад: сцена «пролетает» сквозь звезду.
  return { progress: opening, closing };
}

// One reversible scroll timeline: form → changing count → meaning of the count.
export function achievementInformation(progress, value, lineCount = 2) {
  const p = clamp(progress);
  const reveal = (start, end) => {
    const t = clamp((p - start) / (end - start));
    return t * t * (3 - 2 * t);
  };
  const digits = [...String(value)].map((digit, index, all) => {
    const stop = .74 + index / Math.max(1, all.length - 1) * .06;
    if (p >= stop) return digit;
    const tick = Math.floor(clamp((p - .32) / (stop - .32)) * 20);
    // Keep the final digit for the reveal, rather than landing on it by chance.
    return String((Number(digit) + 1 + (tick * 7 + index * 3) % 9) % 10);
  }).join('');
  return {
    shape: reveal(0, .32),
    number: reveal(.34, .56),
    digits,
    lines: Array.from({ length: lineCount }, (_, index) => {
      const stagger = index / Math.max(1, lineCount - 1) * .12;
      return reveal(.70 + stagger, .88 + stagger);
    }),
  };
}

// Пролёт сквозь звезду на уходе: камера влетает в центр, лучи разгоняются и гаснут.
// light — для телефонов: увеличение 5.2× давало слой ~9800×8800 px (сотни МБ)
// и вылет вкладки, поэтому там звезда растёт до 1.7× и гаснет раньше.
export function achievementClosing(closing, light = false) {
  const c = clamp(closing);
  const ease = (a, b) => { const t = clamp((c - a) / (b - a)); return t * t * (3 - 2 * t); };
  return {
    zoom: 1 + c * c * (light ? .7 : 1.6),
    spin: c * (light ? 16 : 26),
    fade: 1 - (light ? ease(.2, .7) : ease(.3, .8)),
    rays: { scale: 1 + c * 1.7, spin: -c * 12, opacity: 1 - ease(.3, .95) },
    flash: Math.sin(Math.PI * ease(.28, .82)) * .7,
  };
}
