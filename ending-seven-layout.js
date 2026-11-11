import { ease, reel } from './november-layout.js';

export const endingSevenFrames = { office: { width: 1920, height: 1790 }, finale: { width: 1920, height: 1467 } };
export function officeFrame(p, value, reduced = false) {
  if (reduced) p = 1;
  return { desk: ease(0, .52, p), drawer: ease(.12, .68, p), number: ease(.28, .60, p), caption: ease(.63, .89, p), digits: reel(value, ease(.28, .84, p)) };
}
export function finaleFrame(p, reduced = false) {
  if (reduced) p = 1;
  const approach = ease(.12, .72, p), settle = ease(.72, .94, p);
  return { camera: 1 + .95 * (1 - ease(.02, .82, p)), approach, stampScale: (.055 + approach * 1.075) * (1 - settle * (1 - 1 / 1.13)), title: ease(.45, .73, p), name: ease(.66, .85, p), caption: ease(.75, .92, p), button: ease(.84, .97, p) };
}
export function endingVectorPose(kind, index, side, p, pointer = { x: 0, y: 0 }, reduced = false) {
  if (reduced) return { x: 0, y: 0, scale: 1, tilt: 1, rotate: 0, reveal: 1 };
  const final = kind === 'finale', slot = index % 10, depth = .55 + slot * .13;
  const reveal = ease((final ? .01 : .03) + slot * .018, (final ? .62 : .57) + slot * .026, p);
  const arc = Math.sin(p * Math.PI), wave = Math.sin(p * Math.PI * 2) * arc;
  const pointerWeight = ease(.45, .92, p);
  return {
    x: side * (1 - reveal) * (final ? 620 : 380) + side * arc * (final ? -95 : 65) * depth + pointer.x * (final ? 60 : 32) * depth * pointerWeight,
    y: (1 - reveal) * (slot % 2 ? 160 : -190) + wave * 48 * depth + pointer.y * 36 * depth * pointerWeight,
    scale: (final ? .45 : .72) + (final ? .55 : .28) * reveal,
    tilt: final ? .12 + .88 * reveal : .7 + .3 * reveal,
    rotate: side * (1 - reveal) * (final ? 34 : 19) + side * arc * 7 * depth,
    reveal,
  };
}
