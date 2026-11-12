import { requestRenderFrame as requestAnimationFrame, cancelRenderFrame as cancelAnimationFrame } from './performance.js';
import { setHeadingScale } from './typography.js';
import { endingEase, endingFrames, endingInformation, finalePose } from './ending-layout.js';
import { createOfficeAnimation } from './office-animation.js';
import { endingSceneProgress } from './ending-chapter-layout.js';
import { fitScale, placeComposition } from './layout-fit.js';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

// Each scene owns one scroll clock; no independent loops or offscreen work.
function mountScene(section, signal) {
  const composition = section.querySelector('.ending-composition');
  const stage = section.querySelector('.ending-stage');
  const logical = endingFrames[section.id];
  const isFinale = section.id === 'finale';
  const number = section.querySelector('.park-number, .office-number');
  const counter = section.querySelector('.park-digits, .office-number');
  const digits = counter ? [...counter.children] : [];
  const title = section.querySelector('.park-title');
  const caption = section.querySelector('.park-caption > span, .office-caption > span');
  const ornament = section.querySelector('.park-ornament');
  const officeAnimation = section.id === 'office' ? createOfficeAnimation(section, signal) : null;
  const finalParts = isFinale ? Object.fromEntries(['envelope', 'talisman', 'note', 'gift', 'tree', 'ornament-upper', 'ornament-lower', 'caption', 'action-slot'].map(key => [key, section.querySelector(`.final-${key}`)])) : null;
  let frame = 0, active = false, progress, lastTime = 0, lastRendered, forcePaint = true;
  function fit() {
    const scale = fitScale(stage.clientWidth, stage.clientHeight, logical.viewWidth || logical.width, logical.height, section.id);
    const offset = logical.width / 2 - (logical.viewCenterX ?? logical.width / 2);
    placeComposition(composition, scale, ` translateX(${offset}px)`);
    setHeadingScale(composition,scale,stage.clientWidth,stage.clientHeight);
    officeAnimation?.resize(scale);
    forcePaint = true;
    schedule();
  }
  function reveal(node, amount, y = 0, rotation = 0) {
    node.style.opacity = amount;
    node.style.transform = `translateY(${(1 - amount) * y}px) rotate(${(1 - amount) * rotation}deg)`;
  }
  function update(now) {
    frame = 0;
    if (!active || document.hidden || signal.aborted) return;
    const target = endingSceneProgress(section, innerHeight, reducedMotion.matches);
    const dt = lastTime ? Math.min(64, Math.max(1, now - lastTime)) : 16; lastTime = now;
    progress = progress === undefined || reducedMotion.matches ? target : progress + (target - progress) * (1 - Math.exp(-dt / 75));
    const settling = Math.abs(target - progress) > .0001;
    if (!settling) progress = target;
    if (!forcePaint && lastRendered === progress) return;
    forcePaint = false; lastRendered = progress;
    officeAnimation?.seek(progress);
    if (isFinale) {
      const p = finalePose(progress);
      reveal(finalParts.envelope, p.envelope, 120, 6);
      reveal(finalParts.talisman, p.talisman, 480, -7);
      reveal(finalParts.note, p.note, 35);
      reveal(finalParts.gift, p.gift, 110, 12);
      reveal(finalParts.tree, p.tree, 60, -4);
      reveal(finalParts['ornament-upper'], p.ornaments, 70, -16);
      reveal(finalParts['ornament-lower'], p.ornaments, 80, 18);
      reveal(finalParts.caption, p.caption, 40);
      reveal(finalParts['action-slot'], p.button, 60);
      finalParts['action-slot'].style.visibility = p.button === 0 ? 'hidden' : 'visible';
    } else {
      const info = endingInformation(progress, counter.dataset.value);
      reveal(number, info.number, section.id === 'office' ? 320 : 80);
      digits.forEach((digit, i) => { if (digit.textContent !== info.digits[i]) digit.textContent = info.digits[i]; });
      if (title) reveal(title, info.title, 45);
      caption.style.transform = `translateY(${(1 - info.caption) * 120}%)`;
      if (ornament) ornament.style.transform = `rotate(${(1 - endingEase(0, .9, progress)) * 30}deg)`;
    }
    section.dataset.progress = progress.toFixed(4);
    if (officeAnimation) section.dispatchEvent(new CustomEvent('recap:office-progress', { detail: { progress } }));
    if (settling) schedule();
  }
  function schedule() { if (!frame && active && !document.hidden && !signal.aborted) frame = requestAnimationFrame(update); }
  const observer = new IntersectionObserver(entries => {
    active = entries[0].isIntersecting;
    section.classList.toggle('is-motion-active', active);
    if (active) { officeAnimation?.load().catch(error => { if (!signal.aborted) console.error(error); }); schedule(); }
    else { cancelAnimationFrame(frame); frame = 0; progress = undefined; lastTime = 0; }
  }, { rootMargin: officeAnimation ? '100%' : '120px' });
  observer.observe(section);
  const resize = new ResizeObserver(fit); resize.observe(stage); fit();
  window.addEventListener('scroll', schedule, { passive: true, signal });
  document.addEventListener('visibilitychange', () => { lastTime = 0; schedule(); }, { signal });
  reducedMotion.addEventListener('change', schedule, { signal });
  signal.addEventListener('abort', () => { cancelAnimationFrame(frame); observer.disconnect(); resize.disconnect(); }, { once: true });
}
export function mountEndingMotion(root, signal) {
  root.querySelectorAll('.ending-scene').forEach(section => mountScene(section, signal));
}
