export const coinsFrame = { width: 1920, height: 1560, stackLeft: 487, stackTop: 170.48 };
const clamp = value => Math.max(0, Math.min(1, value));
const ease = (start, end, value) => { const t = clamp((value - start) / (end - start)); return t * t * (3 - 2 * t); };

// Source image/mask geometry in Figma 2861:325; all three slices share one image.
export const coinLayers = [
  { name: 'bottom', top: -136.9, maskX: 138, maskY: 861.421, maskW: 830, maskH: 409.591, pivotX: 553, pivotY: 1066.2165, closedY: -317, closedX: 6, angle: 2 },
  { name: 'middle', top: -98.48, maskX: 137.5, maskY: 484.696, maskW: 826.5, maskH: 399.392, pivotX: 550.75, pivotY: 684.392, closedY: 12, closedX: -4, angle: -1 },
  { name: 'top', top: -53.97, maskX: 137.953, maskY: 98.483, maskW: 833.546, maskH: 406.985, pivotX: 554.726, pivotY: 301.9755, closedY: 337.907, closedX: 0, angle: -2 },
];
export function coinsScrollProgress(sectionTop, sectionHeight, viewportHeight) {
  const start = viewportHeight * .12;
  const end = Math.max(viewportHeight - sectionHeight, -viewportHeight * .8);
  return sectionTop <= end + 1 ? 1 : clamp((start - sectionTop) / (start - end));
}
export function coinPose(progress, index) {
  const layer = coinLayers[index];
  const open = ease(.08 + index * .025, .70 + index * .025, progress);
  const arc = open === 0 || open === 1 ? 0 : Math.sin(open * Math.PI);
  return {
    x: layer.closedX * (1 - open) + arc * (index - 1) * 22,
    y: layer.closedY * (1 - open),
    rotation: layer.angle * (1 - open) + arc * (index - 1) * 5,
  };
}
export function coinsInformation(progress, value) {
  const p = clamp(progress);
  return {
    title: ease(0, .26, p),
    number: ease(.48, .76, p),
    caption: ease(.78, 1, p),
    decoration: ease(.55, .90, p),
    digits: [...String(value)].map((digit, index, all) => {
      const stop = .84 + index / Math.max(1, all.length - 1) * .08;
      if (p >= stop) return digit;
      const tick = Math.floor(clamp((p - .48) / (stop - .48)) * 18);
      return String((Number(digit) + 1 + (tick * 7 + index * 3) % 9) % 10);
    }).join(''),
  };
}
export function coinsEntrance(sectionTop, viewportHeight) { return ease(.70, .03, sectionTop / viewportHeight); }
