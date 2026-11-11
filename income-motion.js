import { animateDigits } from './motion.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
export const clamp01 = value => Math.max(0, Math.min(1, value));
export function scrollProgress(scroll, start, end) {
  return clamp01((scroll - start) / Math.max(1, end - start));
}
export function videoScrollRange(sceneTop, counterTop, viewport, maxScroll) {
  const start = Math.max(0, sceneTop - viewport);
  const end = Math.max(start + 1, Math.min(maxScroll, counterTop - viewport * .45));
  return { start, end };
}
export function pointerRepulsion(pointer, center, scale = 1) {
  if (!pointer.active) return { x: 0, y: 0 };
  const dx = center.x - pointer.x;
  const dy = center.y - pointer.y;
  const distance = Math.hypot(dx, dy);
  const force = clamp01(1 - distance / (250 * scale)) ** 2 * 175;
  const angle = distance > 1 ? Math.atan2(dy, dx) : -Math.PI / 2;
  return { x: Math.cos(angle) * force, y: Math.sin(angle) * force };
}

export function mountIncomeMotion(canvas, signal) {
  const section = canvas.querySelector('.income');
  if (!section) return;
  const counter = section.querySelector('.income-counter');
  const numberPanel = section.querySelector('.income-number-panel');
  const star = section.querySelector('.income-star-scroll');
  const video = section.querySelector('video');
  const fallback = section.querySelector('.income-video-fallback');
  const balls = [...section.querySelectorAll('.income-orbit')].map(orbit => ({ orbit, image: orbit.querySelector('img'), x: 0, y: 0 }));
  const pointer = { active: false, x: 0, y: 0 };
  let frame = 0;
  let orbitFrame = 0;
  let inView = false;
  let desiredTime = 0;
  let counterStarted = false;

  function seek() {
    if (signal.aborted || !inView || video.readyState < 1 || video.seeking || !Number.isFinite(video.duration)) return;
    // Every frame in the local video is a keyframe, allowing immediate reverse seeks.
    if (Math.abs(video.currentTime - desiredTime) > 1 / 48) video.currentTime = desiredTime;
  }
  function update() {
    frame = 0;
    if (!inView || signal.aborted || document.hidden) return;
    const scroll = window.scrollY;
    // Start at the first visible pixel of the video; finish as the counter enters the main view.
    const range = videoScrollRange(video.getBoundingClientRect().top + scroll, numberPanel.getBoundingClientRect().top + scroll, window.innerHeight, document.documentElement.scrollHeight - window.innerHeight);
    const progress = scrollProgress(scroll, range.start, range.end);
    section.dataset.scrollProgress = progress.toFixed(3);
    if (reducedMotion.matches) {
      star.style.transform = 'none';
      desiredTime = 0;
    } else {
      const rotation = (progress - .5) * 58;
      const starScale = .84 + Math.sin(progress * Math.PI) * .16;
      star.style.transform = `translateY(${(1 - progress) * 45}px) rotate(${rotation}deg) scale(${starScale})`;
      const duration = Number.isFinite(video.duration) ? Math.max(0, video.duration - 1 / 24) : 0;
      desiredTime = Math.round(progress * duration * 24) / 24;
    }
    seek();
  }
  function schedule() { if (!frame && inView && !document.hidden && !signal.aborted) frame = requestAnimationFrame(update); }
  function moveBalls() {
    orbitFrame = 0;
    if (!inView || signal.aborted || document.hidden) return;
    const panel = numberPanel.getBoundingClientRect();
    const scale = section.getBoundingClientRect().width / 1745;
    // Move the child image: the floating orbit and cursor force remain independent.
    const targets = balls.map(ball => {
      const box = ball.orbit.getBoundingClientRect();
      const force = reducedMotion.matches ? { x: 0, y: 0 } : pointerRepulsion(pointer, { x: box.x + box.width / 2, y: box.y + box.height / 2 }, scale);
      return {
        x: Math.max((panel.left + 8 - box.left) / scale, Math.min((panel.right - 8 - box.right) / scale, force.x)),
        y: Math.max((panel.top + 8 - box.top) / scale, Math.min((panel.bottom - 8 - box.bottom) / scale, force.y)),
      };
    });
    balls.forEach((ball, i) => {
      ball.x += (targets[i].x - ball.x) * .11;
      ball.y += (targets[i].y - ball.y) * .11;
      ball.image.style.transform = `translate(${ball.x.toFixed(2)}px, ${ball.y.toFixed(2)}px)`;
    });
    if (!reducedMotion.matches) orbitFrame = requestAnimationFrame(moveBalls);
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.target === counter) {
        if (!entry.isIntersecting || entry.intersectionRatio < .12 || counterStarted) continue;
        counterStarted = true;
        animateDigits(counter, counter.dataset.value, signal, { preserveSlots: true });
        observer.unobserve(counter);
      } else {
        inView = entry.isIntersecting;
        section.classList.toggle('is-active', inView);
        if (inView && !orbitFrame) orbitFrame = requestAnimationFrame(moveBalls);
        schedule();
      }
    }
  }, { threshold: [0, .12] });
  observer.observe(section);
  observer.observe(counter);
  window.addEventListener('scroll', schedule, { passive: true, signal });
  window.addEventListener('resize', schedule, { passive: true, signal });
  window.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse') return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
  }, { passive: true, signal });
  document.documentElement.addEventListener('pointerleave', () => { pointer.active = false; }, { signal });
  window.addEventListener('blur', () => { pointer.active = false; }, { signal });
  document.addEventListener('visibilitychange', () => {
    schedule();
    if (inView && !document.hidden && !orbitFrame) orbitFrame = requestAnimationFrame(moveBalls);
  }, { signal });
  video.addEventListener('loadedmetadata', schedule, { signal });
  video.addEventListener('loadeddata', schedule, { signal });
  video.addEventListener('seeked', seek, { signal });
  video.addEventListener('error', () => { fallback.hidden = false; }, { signal });
  reducedMotion.addEventListener('change', () => {
    schedule();
    cancelAnimationFrame(orbitFrame);
    orbitFrame = requestAnimationFrame(moveBalls);
  }, { signal });
  signal.addEventListener('abort', () => {
    observer.disconnect();
    cancelAnimationFrame(frame);
    cancelAnimationFrame(orbitFrame);
    video.pause();
    video.removeAttribute('src');
    video.load();
  }, { once: true });
  schedule();
}
