import { config } from './config.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

export function animateDigits(element, value, signal, { preserveSlots = false, delay = 0 } = {}) {
  const digits = String(value).split('');
  if (!preserveSlots) element.replaceChildren();
  const slots = digits.map((digit, index) => {
    const span = preserveSlots ? element.children[index] : document.createElement('span');
    if (!preserveSlots) { span.className = 'counter-digit'; element.append(span); }
    span.textContent = reducedMotion.matches ? digit : String((Number(digit) + 4 + index) % 10);
    return span;
  });
  if (!preserveSlots) element.style.setProperty('--counter-size', `${Math.min(700, 1500 / Math.max(digits.length * .5, 1))}px`);
  if (reducedMotion.matches) return;
  const started = performance.now() + delay;
  let frame;
  let lastTick = -1;
  const finish = () => slots.forEach((slot, i) => { slot.textContent = digits[i]; });
  function tick(now) {
    if (signal.aborted) return;
    if (reducedMotion.matches) { finish(); return; }
    const elapsed = now - started;
    if (elapsed < 0) { frame = requestAnimationFrame(tick); return; }
    const tickIndex = Math.floor(elapsed / 65);
    if (tickIndex !== lastTick) {
      slots.forEach((slot, i) => {
        const stopAt = config.animation.counterDuration + i * config.animation.digitStagger;
        slot.textContent = elapsed >= stopAt ? digits[i] : String(Math.floor(Math.random() * 10));
        slot.classList.toggle('digit-settled', elapsed >= stopAt);
      });
      lastTick = tickIndex;
    }
    if (elapsed < config.animation.counterDuration + (digits.length - 1) * config.animation.digitStagger) frame = requestAnimationFrame(tick);
    else finish();
  }
  frame = requestAnimationFrame(tick);
  signal.addEventListener('abort', () => cancelAnimationFrame(frame), { once: true });
}

export function mountMotion(canvas, signal, revealRoot = canvas) {
  const counter = canvas.querySelector('.counter');
  counter.textContent = counter.dataset.value;
  let counterStarted = false;
  const reveals = [...revealRoot.querySelectorAll('[data-reveal]')];
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      if (entry.target.classList.contains('visit-count') && !counterStarted) {
        counterStarted = true;
        animateDigits(counter, counter.dataset.value, signal);
      }
      observer.unobserve(entry.target);
    }
  }, { threshold: .12 });
  reveals.forEach(element => observer.observe(element));

  const layers = [...canvas.querySelectorAll('[data-parallax]')];
  let frame = 0;
  const pointer = { x: 0, y: 0 };
  const refresh = () => {
    frame = 0;
    const bounds = canvas.getBoundingClientRect();
    if (bounds.bottom < 0 || bounds.top > innerHeight || document.hidden) return;
    const scale = bounds.width / 1920;
    const scroll = window.scrollY / scale;
    for (const layer of layers) {
      const strength = Number(layer.dataset.parallax) * config.animation.parallaxStrength;
      const local = layer.closest('.personal') ? Math.max(-600, Math.min(600, scroll - 1441)) : Math.min(scroll, 2200);
      const y = reducedMotion.matches ? 0 : Math.max(-115, Math.min(115, local * strength + pointer.y * strength * 120));
      const x = reducedMotion.matches ? 0 : pointer.x * strength * 100;
      layer.style.transform = `translate(${x}px, ${y}px)`;
    }
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(refresh); };
  window.addEventListener('scroll', schedule, { passive: true, signal });
  window.addEventListener('resize', schedule, { passive: true, signal });
  window.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse') return;
    pointer.x = event.clientX / innerWidth - .5;
    pointer.y = event.clientY / innerHeight - .5;
    schedule();
  }, { passive: true, signal });
  reducedMotion.addEventListener('change', schedule, { signal });
  signal.addEventListener('abort', () => { observer.disconnect(); cancelAnimationFrame(frame); }, { once: true });
}
