import { endingEase, endingProgress } from './ending-layout.js';
// Virtual original sections retain their own clocks inside one sticky window.
export const endingChapterHeight = 3.5;
export const finaleChapterOffset = .3;
export function endingChapterFrame(top, viewport, reduced = false) {
  const units = -top / Math.max(1, viewport);
  const handoff = reduced ? 1 : endingEase(.62, 1.24, units);
  return {
    office: reduced ? 1 : endingProgress(top, viewport * 1.5, viewport),
    finale: reduced ? 1 : endingProgress(top + finaleChapterOffset * viewport, viewport * 3.2, viewport),
    handoff,
  };
}
export function endingSceneProgress(section, viewport, reduced = false) {
  const chapter = section.closest('.ending-chapter');
  if (chapter && !reduced) return endingChapterFrame(chapter.getBoundingClientRect().top, viewport)[section.id];
  const b = section.getBoundingClientRect();
  return reduced ? 1 : endingProgress(b.top, b.height, viewport);
}
export function toEndingAnchor(root, hash) {
  const chapter = root.querySelector('.ending-chapter');
  if (!chapter || !['#office','#finale'].includes(hash) || matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  const offset = hash === '#finale' ? (endingChapterHeight - 1) * innerHeight : 0;
  window.scrollTo({ top: chapter.getBoundingClientRect().top + scrollY + offset, behavior: 'instant' });
  return true;
}
