import { requestRenderFrame as requestAnimationFrame, cancelRenderFrame as cancelAnimationFrame } from './performance.js';
import { animateDigits } from './motion.js';
import { postcardLayout, postcardPose, postcardsFrame, postcardsScrollProgress } from './postcards-layout.js';
import { achievementTransition } from './achievements-layout.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

export function mountPostcardsMotion(root, signal) {
  const section = root.querySelector('.postcards');
  if (!section) return;
  const composition = section.querySelector('.postcards-composition');
  const fans = [...section.querySelectorAll('.postcards-artboard')].map(fan => ({
    key: fan.closest('.postcards-stage-top') ? 'upper' : 'lower',
    faces: [...fan.querySelectorAll('.postcard-face')],
  }));
  const decoration = section.querySelector('.postcards-decoration');
  const nextSection = root.querySelector('.achievements');
  let frame = 0;
  let countersStarted = false;
  let inView = false;
  let renderedProgress;
  let lastTime = 0;

  function fit() {
    const scale = Math.min(1, section.clientWidth / postcardsFrame.width);
    section.style.height = `${(nextSection ? postcardsFrame.transitionHeight : postcardsFrame.height) * scale}px`;
    composition.style.transform = `translateX(-50%) scale(${scale})`;
    schedule();
  }
  function update(now) {
    frame = 0;
    if (signal.aborted || !inView || document.hidden) return;
    const scale = Math.min(1, section.clientWidth / postcardsFrame.width);
    const box = section.getBoundingClientRect();
    const targets = reducedMotion.matches ? { upper: 1, lower: 1 } : postcardsScrollProgress(box.top, innerHeight, box.height, scale);
    const delta = Math.min(64, Math.max(1, now - lastTime));
    lastTime = now;
    if (renderedProgress === undefined || reducedMotion.matches) renderedProgress = { ...targets };
    let settling = false;
    for (const key of ['upper', 'lower']) {
      renderedProgress[key] += (targets[key] - renderedProgress[key]) * (1 - Math.exp(-delta / 90));
      if (Math.abs(targets[key] - renderedProgress[key]) > .0001) settling = true;
      else renderedProgress[key] = targets[key];
    }
    const upperContinuation = reducedMotion.matches ? 0 : renderedProgress.lower;
    const cardExit = nextSection ? achievementTransition(nextSection.getBoundingClientRect().top, innerHeight).cards : 0;
    fans.forEach(({ key, faces }) => faces.forEach((face, index) => {
      const card = postcardLayout[index];
      const pose = postcardPose(renderedProgress[key], index, card, key === 'upper' ? upperContinuation : 0);
      face.style.transform = `translate(${pose.x - card.width / 2}px, ${pose.y - card.height / 2}px) rotate(${pose.rotation}deg) scale(${pose.scale})`;
      face.style.opacity = key === 'lower' ? pose.opacity * (1 - cardExit) : pose.opacity;
    }));
    decoration.style.transform = `translate(-50%, -50%) rotate(${56.41 - (1 - renderedProgress.lower) * 30}deg)`;
    section.dataset.upperProgress = renderedProgress.upper.toFixed(4);
    section.dataset.upperContinuation = upperContinuation.toFixed(4);
    section.dataset.lowerProgress = renderedProgress.lower.toFixed(4);
    section.dataset.progress = section.dataset.lowerProgress;
    section.dataset.exit = cardExit.toFixed(4);
    if (settling) schedule();
  }
  function schedule() { if (!frame && inView && !document.hidden && !signal.aborted) frame = requestAnimationFrame(update); }
  const observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && !countersStarted) {
      countersStarted = true;
      section.querySelectorAll('.postcards-digits').forEach((counter, index) => {
        animateDigits(counter, counter.dataset.value, signal, { preserveSlots: true, delay: index * 180 });
      });
    }
    schedule();
  }, { threshold: .25 });
  observer.observe(section.querySelector('.postcards-stats'));
  const sceneObserver = new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting;
    section.classList.toggle('is-motion-active', inView);
    if (!inView) { cancelAnimationFrame(frame); frame = 0; lastTime = 0; renderedProgress = undefined; }
    else schedule();
  }, { rootMargin: '200px' });
  sceneObserver.observe(section);
  const resize = new ResizeObserver(fit);
  resize.observe(section);
  fit();
  window.addEventListener('scroll', schedule, { passive: true, signal });
  window.addEventListener('resize', fit, { passive: true, signal });
  document.addEventListener('visibilitychange', schedule, { signal });
  reducedMotion.addEventListener('change', schedule, { signal });
  signal.addEventListener('abort', () => {
    observer.disconnect();
    sceneObserver.disconnect();
    resize.disconnect();
    cancelAnimationFrame(frame);
  }, { once: true });
  schedule();
}
