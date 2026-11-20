import { ease } from './november-layout.js';
import { filmTime } from './scroll-film-timing.js';
import { spendingPose, spendingScrollProgress, spendingShapeEntrance } from './spending-layout.js?local=20';
import { fitScale } from './layout-fit.js';

export function bookChapterPlan(hasSpending) {
  return hasSpending ? { height: 5.2, anchor: 2.05, offset: 1.45 } : { height: 3.8, anchor: 0, offset: 0 };
}

// A single book travels from its tile to the learning artboard. Both routes
// converge before the cover opens; no metric is required by another metric.
export function bookFrame(scroll, hasSpending, reduced = false) {
  const q = reduced ? 4 : scroll;
  const local = q - bookChapterPlan(hasSpending).offset;
  return {
    travel: ease(hasSpending ? 1.25 : -.1, hasSpending ? 2 : .55, q),
    appear: reduced ? 1 : ease(hasSpending ? .4 : -.2, hasSpending ? .95 : .35, q),
    exit: hasSpending ? ease(1.3, 2.15, q) : 1,
    time: reduced ? 5.83 : filmTime([[.55, 0], [.95, 1.4], [1.55, 4.2], [1.98, 5.83]], local),
    title: ease(.35, .85, local),
    courses: ease(1.72, 2.12, local),
    hours: ease(1.84, 2.24, local),
    digitsCourses: ease(1.72, 2.22, local),
    digitsHours: ease(1.84, 2.35, local),
  };
}

export function bookGeometry(width, height, travel, hasSpending) {
  const fit = fitScale(width, height, 1920, 1662, 'learning');
  if (travel >= 1) return { x: width / 2, y: height / 2, size: 1662 * fit, fit };
  const tileFit = fitScale(width, height, 1920, 1300, 'spending');
  const start = hasSpending ? { x: width / 2, y: height / 2 + 357.5 * tileFit, size: 435 * tileFit } : { x: width / 2, y: height * 1.12, size: 730 * fit };
  return {
    x: start.x,
    y: start.y + (height / 2 - start.y) * travel,
    size: start.size + (1662 * fit - start.size) * travel,
    fit,
  };
}

export function bookSpendingPose(width, height, scroll, travel, comp = null) {
  const progress = spendingScrollProgress(-scroll * height, 2.2 * height, height);
  const pose = spendingPose(progress, 8), fit = fitScale(width, height, 1920, 1300, 'spending');
  const end = bookGeometry(width, height, travel, true);
  // Exact same spiral, rotation, scale and reveal clock as the replaced tile.
  // comp — реальное положение сцены «Покупок» на экране (её масштаб и сдвиги меняются
  // под телефон и заголовок): так книга встаёт ровно в свою клетку сетки.
  const orbit = comp
    ? { x: comp.left + (1.5 + pose.x + 191.7) * comp.s, y: comp.top + (100 + pose.y + 191.7) * comp.s, size: 435 * comp.s * pose.scale }
    : { x: width / 2 + (pose.x + 191.7 + 1.5 - 960) * fit, y: height / 2 + (pose.y + 191.7 + 100 - 650) * fit, size: 435 * fit * pose.scale };
  return {
    x: orbit.x + (end.x - orbit.x) * travel,
    y: orbit.y + (end.y - orbit.y) * travel,
    size: orbit.size + (end.size - orbit.size) * travel,
    rotation: pose.rotation * (1 - travel),
    opacity: spendingShapeEntrance(progress, 8),
    fit: end.fit,
  };
}
