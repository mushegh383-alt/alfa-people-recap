import { setHeadingScale } from './typography.js';
import { requestRenderFrame as requestAnimationFrame, cancelRenderFrame as cancelAnimationFrame } from './performance.js';
import { spendingEntrance, spendingFrame, spendingInformation, spendingPose, spendingScrollProgress, spendingShapeEntrance, spendingShapes, shapeColor } from './spending-layout.js?local=20';
import { fitScale, placeComposition } from './layout-fit.js';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

export function mountSpendingMotion(root, signal) {
  const section = root.querySelector('.spending');
  if (!section) return;
  const stage = section.querySelector('.spending-stage');
  const chapter = section.closest('.book-chapter');
  const composition = section.querySelector('.spending-composition');
  const paired = (chapter || section).classList.contains('overlap-entry');
  const heading = section.querySelector('.spending-heading');
  const artboard = section.querySelector('.spending-artboard');
  const paper = section.querySelector('.spending-paper');
  const shapes = [...section.querySelectorAll('.spending-shape')].map(item => ({ item, face: item.querySelector('.spending-face'), core: item.querySelector('.spending-ring-core') }));
  const number = section.querySelector('.spending-number');
  const counter = section.querySelector('.spending-digits');
  const digits = [...counter.children];
  const caption = section.querySelector('.spending-caption span');
  const note = section.querySelector('.spending-note');
  let frame = 0, inView = false, progress, entrance, lastTime = 0, lastPaint;
  function fit() {
    // Запас сверху под заголовок блока. На телефоне сцена вписана по ширине —
    // место над плитками есть, достаточно сдвинуть её немного вниз.
    const portrait = stage.clientWidth / Math.max(1, stage.clientHeight) < .8;
    // Телефон: колонка от заголовка (−760) до примечания (~1740) целиком по высоте экрана.
    let scale = fitScale(stage.clientWidth, stage.clientHeight, spendingFrame.width, spendingFrame.height + (portrait ? 0 : 360), 'spending');
    if (portrait) scale = Math.min(scale, stage.clientHeight * .96 / 2500);
    placeComposition(composition, scale, ` translateY(${portrait ? 160 : 180}px)`);
    setHeadingScale(composition, scale, stage.clientWidth, stage.clientHeight);
    lastPaint=undefined;schedule();
  }
  function update(now) {
    frame = 0;
    if (!inView || document.hidden || signal.aborted) return;
    // In the book chapter, the original 220vh coin animation runs unchanged
    // inside the shared sticky viewport. The remaining scroll opens the book.
    const box = chapter ? { top: chapter.getBoundingClientRect().top, height: stage.clientHeight * (reducedMotion.matches ? 1 : 2.2) } : section.getBoundingClientRect();
    const target = reducedMotion.matches ? 1 : spendingScrollProgress(box.top, box.height, stage.clientHeight);
    const enterTarget = reducedMotion.matches ? 1 : spendingEntrance(box.top, stage.clientHeight);
    // During the overlap, both scenes share the same viewport instead of
    // bringing the next artboard up from the bottom as a separate page.
    stage.style.transform = !reducedMotion.matches && section.classList.contains('follows-coins') ? `translateY(${-Math.max(0, box.top)}px)` : '';
    const delta = lastTime ? Math.min(64, Math.max(1, now - lastTime)) : 16;
    lastTime = now;
    if (progress === undefined || reducedMotion.matches || document.documentElement.classList.contains('is-portrait')) { progress = target; entrance = enterTarget; }
    else {
      progress += (target - progress) * (1 - Math.exp(-delta / 75));
      entrance += (enterTarget - entrance) * (1 - Math.exp(-delta / 90));
    }
    const settling = Math.abs(target - progress) > .0001 || Math.abs(enterTarget - entrance) > .0001;
    if (!settling) { progress = target; entrance = enterTarget; }
    const key=`${progress}:${entrance}:${Math.max(0,box.top)}:${reducedMotion.matches}`;
    if(key===lastPaint)return;lastPaint=key;
    composition.style.opacity = paired || section.classList.contains('follows-coins') ? 1 : entrance;
    if (paired && heading) heading.style.opacity = reducedMotion.matches ? 1 : spendingEntrance(box.top,stage.clientHeight);
    // Both scenes use the same viewport-aligned paper. Keep the previous
    // paper visible through the handoff, without a second dark overlay.
    paper.style.opacity = section.classList.contains('follows-coins') && !reducedMotion.matches ? (box.top <= 0 ? 1 : 0) : entrance;
    paper.style.setProperty('--spending-paper-feather', `${(1 - entrance) * 160}px`);
    // Free motion uses the entire window. Restore the source frame edge only
    // as the shapes land in their final rows (the sixth top tile is off-frame).
    const landing = Math.max(0, Math.min(1, (progress - .86) / .14));
    const bleed = (1 - landing * landing * (3 - 2 * landing)) * 600;
    artboard.style.clipPath = landing === 0 ? 'none' : `inset(${-70 - bleed}px ${-bleed}px ${-70 - bleed}px)`;
    shapes.forEach(({ item, face, core }, index) => {
      const shape = spendingShapes[index];
      const pose = spendingPose(progress, index);
      item.style.opacity = spendingShapeEntrance(progress, index);
      item.style.transform = `translate(${pose.x}px, ${pose.y}px) rotate(${pose.rotation}deg) scale(${pose.scale})`;
      if (['solid', 'ring', 'ornament'].includes(shape.kind)) face.style.borderRadius = `${shape.kind === 'solid' && !item.hasAttribute('data-artwork') ? Math.max(14, pose.radius) : pose.radius}%`;
      if (!item.hasAttribute('data-artwork') && ['solid', 'ring'].includes(shape.kind)) face.style.background = shapeColor(progress, index, shape.color);
      if (core) { core.style.background = shapeColor(progress, index + 2, '#2abbff'); core.style.borderRadius = `${pose.radius}%`; }
    });
    const information = spendingInformation(progress, counter.dataset.value);
    number.style.opacity = information.number;
    counter.style.transform = `translateY(${(1 - information.number) * 70}px) scale(${.94 + information.number * .06})`;
    digits.forEach((digit, index) => { if (digit.textContent !== information.digits[index]) digit.textContent = information.digits[index]; });
    caption.style.transform = `translateY(${(1 - information.caption) * 120}%)`;
    note.style.opacity = information.caption;
    section.dataset.progress = progress.toFixed(4);
    section.dataset.state = progress < .48 ? 'spiral' : progress < .78 ? 'counter' : progress < 1 ? 'caption' : 'complete';
    if (settling) schedule();
  }
  function schedule() { if (!frame && inView && !document.hidden && !signal.aborted) frame = requestAnimationFrame(update); }
  const observer = new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting;
    section.classList.toggle('is-motion-active', inView);
    if (!inView) { cancelAnimationFrame(frame); frame = 0; progress = entrance = undefined; lastPaint=undefined;lastTime = 0; composition.style.opacity = paper.style.opacity = 0; }
    else schedule();
  }, { rootMargin:'100% 0px' });
  observer.observe(chapter || section);
  const resize = new ResizeObserver(fit);
  resize.observe(stage); fit();
  window.addEventListener('scroll', schedule, { passive: true, signal });
  document.addEventListener('visibilitychange', () => { lastTime = 0; schedule(); }, { signal });
  reducedMotion.addEventListener('change', schedule, { signal });
  signal.addEventListener('abort', () => { cancelAnimationFrame(frame); observer.disconnect(); resize.disconnect(); }, { once: true });
}
