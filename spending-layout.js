import { coinsInformation } from './coins-layout.js';
import { isPortrait } from './layout-fit.js';
export const spendingFrame = { width: 1920, height: 1300, artboardTop: 100, artboardHeight: 1099.428 };
const cell = 383.4;
const top = 12.814;
const bottom = 716.028;
export const spendingShapes = [
  { kind: 'solid', x: 0, y: top, width: cell, height: cell, color: '#130f0c', round: 0 },
  { kind: 'solid', x: cell, y: top, width: cell, height: cell, color: '#fd2b42', round: 0 },
  { kind: 'snowflake', x: cell * 2, y: top, width: cell, height: cell, color: '#f8e4c2', round: 0 },
  { kind: 'solid', x: cell * 3, y: top, width: cell, height: cell, color: '#f723a6', round: 0 },
  { kind: 'ornament', x: cell * 4, y: 0, width: 409.028, height: 409.028, color: '#2abbff', round: 0 },
  { kind: 'solid', x: cell * 4 + 409.028, y: top, width: cell, height: cell, color: '#1ac3fd', round: 50 },
  { kind: 'solid', x: 0, y: bottom, width: cell, height: cell, color: '#f8e4c2', round: 0 },
  { kind: 'ring', x: cell, y: bottom, width: cell, height: cell, color: '#ddaa55', round: 50 },
  { kind: 'solid', x: cell * 2, y: bottom, width: cell, height: cell, color: '#f723a6', round: 0 },
  { kind: 'alfa', x: cell * 3, y: bottom, width: cell, height: cell, color: '#fd2b42', round: 0 },
  { kind: 'burst', x: cell * 4, y: bottom + 25.2, width: 384, height: 333, color: '#2abbff', round: 0 },
];
const clamp = value => Math.max(0, Math.min(1, value));
const ease = (start, end, value) => { const t = clamp((value - start) / (end - start)); return t * t * (3 - 2 * t); };
const palette = ['#2abbff', '#f723a6', '#fd2b42', '#ddaa55', '#f8e4c2'];
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
function mix(a, b, t) { return a.map((v, i) => Math.round(v + (b[i] - v) * t)); }
export function shapeColor(progress, index, base) {
  const p = clamp(progress);
  if (p === 0 || p === 1) return base;
  const phase = p * 4 + index * .6;
  const slot = Math.floor(phase);
  const cycle = mix(rgb(palette[slot % palette.length]), rgb(palette[(slot + 1) % palette.length]), phase - slot);
  return `rgb(${mix(rgb(base), cycle, Math.sin(p * Math.PI) * .95).join(', ')})`;
}
// Телефон: вместо двух широких рядов (≈2300 px, обрезались по бокам) — сетка
// в 3 колонки на всю ширину (ряды 3+3+3+2), кольцо разлёта тоже уже.
const portrait = () => typeof innerWidth === 'number' && isPortrait(innerWidth, innerHeight);
export function spendingSlot(index) {
  const shape = spendingShapes[index];
  if (!portrait()) return shape;
  const col = index % 3, row = Math.floor(index / 3), inRow = row === 3 ? 2 : 3;
  const cx = 958 - inRow * cell / 2 + col * cell + cell / 2, cy = -510 + row * cell + cell / 2;
  return { ...shape, x: cx - shape.width / 2, y: cy - shape.height / 2 };
}
export function spendingPose(progress, index) {
  const p = clamp(progress);
  const shape = spendingSlot(index);
  const t = ease(.40 + index * .004, .90 + index * .006, p);
  if (t === 1) return { x: shape.x, y: shape.y, rotation: 0, scale: 1, radius: shape.round };
  // Preserve even spacing while the coins disappear. Only then let the
  // orbit flow into the original rows, rather than converging into a pile.
  const startAngle = -Math.PI / 2 + index / spendingShapes.length * Math.PI * 2;
  const angle = startAngle + p * Math.PI * 1.5;
  const tall = portrait();
  const radius = (tall ? 560 : 800) - ease(0, .65, p) * (tall ? 70 : 100);
  const orbitX = 960 + Math.cos(angle) * radius - shape.width / 2;
  const orbitY = (tall ? 330 : 530) + Math.sin(angle) * radius - shape.height / 2;
  const morph = Math.sin(ease(0, .90, p) * Math.PI);
  return {
    x: orbitX + (shape.x - orbitX) * t,
    y: orbitY + (shape.y - orbitY) * t,
    rotation: (1 - ease(0, .90 + index * .006, p)) * (index % 2 ? 270 : -270),
    scale: .68 + ease(0, .65, p) * .32,
    radius: shape.round === 50 ? 50 - morph * 34 : morph * 50,
  };
}
export function spendingScrollProgress(sectionTop, sectionHeight, viewportHeight) {
  const start = viewportHeight * .94;
  const end = viewportHeight - sectionHeight;
  return sectionTop <= end + 1 ? 1 : clamp((start - sectionTop) / (start - end));
}
export function spendingEntrance(sectionTop, viewportHeight) { return ease(.55, .05, sectionTop / viewportHeight); }
export function spendingShapeEntrance(progress, index) {
  return ease(.015 + index * .012, .12 + index * .012, clamp(progress));
}
export function spendingInformation(progress, value) {
  const p = clamp(progress);
  return { ...coinsInformation(p, value), number: ease(.30, .60, p) };
}
