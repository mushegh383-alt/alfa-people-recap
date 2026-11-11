import { coinsInformation } from './coins-layout.js';

export const endingFrames = {
  parksharing: { width: 1920, height: 2044 },
  office: { width: 1919, height: 1790 },   // финальный кадр Figma 296:12862
  finale: { width: 1920, height: 2300, viewWidth: 2860, viewCenterX: 1156 },
};
const clamp = value => Math.max(0, Math.min(1, value));
export function endingEase(start, end, value) {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
}
export function endingProgress(top, height, viewport) {
  const start = viewport * .35;
  const end = viewport - height;
  return top <= end + 1 ? 1 : clamp((start - top) / (start - end));
}
export function endingInformation(progress, value) {
  const p = clamp(progress);
  return {
    title: endingEase(0, .28, p),
    number: endingEase(.22, .54, p),
    caption: endingEase(.66, .94, p),
    digits: coinsInformation(.48 + clamp(p / .82) * .52, value).digits,
  };
}
export function finalePose(progress) {
  const p = clamp(progress);
  return {
    envelope: endingEase(0, .34, p),
    talisman: endingEase(.14, .65, p),
    note: endingEase(.54, .78, p),
    gift: endingEase(.36, .76, p),
    tree: endingEase(.04, .42, p),
    ornaments: endingEase(.08, .46, p),
    caption: endingEase(.72, .90, p),
    button: endingEase(.82, 1, p),
  };
}
