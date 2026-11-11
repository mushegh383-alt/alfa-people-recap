import { requestRenderFrame as requestAnimationFrame, cancelRenderFrame as cancelAnimationFrame } from './performance.js';
import { animateDigits } from './motion.js';
import { clamp01 } from './income-motion.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

export function mountThanksMotion(canvas, signal) {
  const section = canvas.querySelector('.thanks');
  if (!section) return;
  const burst = section.querySelector('.thanks-burst-motion');
  const heart = section.querySelector('.thanks-heart-motion');
  const scene = section.querySelector('.thanks-scene');
  const fit = () => {
    const scale = Math.max(.01, Math.min(scene.clientWidth / 1920, scene.clientHeight / 1441));
    scene.style.setProperty('--thanks-scale', scale);
  };
  const sceneResize = new ResizeObserver(fit);
  sceneResize.observe(scene);
  fit();
  const pointer = { x: 0, y: 0 };
  let frame = 0;
  let inView = false;
  let started = false;

  function update() {
    frame = 0;
    if (!inView || signal.aborted || document.hidden) return;
    const box = section.getBoundingClientRect();
    const progress = clamp01((innerHeight - box.top) / (innerHeight + box.height));
    if (reducedMotion.matches) {
      burst.style.transform = 'none';
      heart.style.transform = 'none';
    } else {
      burst.style.transform = `translate(${pointer.x * -18}px, ${(progress - .5) * -75}px) rotate(${(progress - .5) * 6}deg)`;
      heart.style.transform = `translate(${pointer.x * 18}px, ${pointer.y * 12}px) rotate(${pointer.x * 2.5}deg)`;
    }
  }
  function schedule() { if (!frame && inView && !document.hidden && !signal.aborted) frame = requestAnimationFrame(update); }
  const observer = new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting;
    section.classList.toggle('is-active', inView);
    if (inView && !started) {
      started = true;
      section.classList.add('is-revealed');
      [...section.querySelectorAll('.thanks-digits')].forEach((counter, index) => {
        animateDigits(counter, counter.dataset.value, signal, { preserveSlots: true, delay: 300 + index * 240 });
      });
    }
    schedule();
  }, { threshold: .15 });
  observer.observe(section);
  window.addEventListener('scroll', schedule, { passive: true, signal });
  window.addEventListener('resize', schedule, { passive: true, signal });
  window.addEventListener('pointermove', event => {
    if (!inView || event.pointerType !== 'mouse') return;
    const bounds = section.getBoundingClientRect();
    pointer.x = Math.max(-.5, Math.min(.5, (event.clientX - bounds.x) / bounds.width - .5));
    pointer.y = Math.max(-.5, Math.min(.5, (event.clientY - bounds.y) / bounds.height - .5));
    schedule();
  }, { passive: true, signal });
  window.addEventListener('blur', () => { pointer.x = pointer.y = 0; schedule(); }, { signal });
  document.addEventListener('visibilitychange', schedule, { signal });
  reducedMotion.addEventListener('change', schedule, { signal });
  signal.addEventListener('abort', () => { observer.disconnect(); sceneResize.disconnect(); cancelAnimationFrame(frame); }, { once: true });
  schedule();
}
