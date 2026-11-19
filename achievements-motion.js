import { setTextScale } from './typography.js';
import { requestRenderFrame as requestAnimationFrame, cancelRenderFrame as cancelAnimationFrame, getQuality } from './performance.js';
import { achievementInformation, achievementPlayback, achievementTransition, achievementsFrame, achievementClosing, achievementsSceneScale } from './achievements-layout.js';
import { createRaysRenderer } from './achievements-renderer.js';
import { fitScale, isPortrait, placeComposition, screenRect } from './layout-fit.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

export function mountAchievementsMotion(root, signal) {
  const section = root.querySelector('.achievements');
  if (!section) return;
  const stage = section.querySelector('.achievements-stage');
  const hasCoins = Boolean(root.querySelector('.coins'));
  const composition = section.querySelector('.achievements-composition');
  const focal = section.querySelector('.achievement-focal');
  const number = section.querySelector('.achievement-number');
  const counter = section.querySelector('.achievement-digits');
  const digits = [...counter.children];
  const lines = [...section.querySelectorAll('.achievement-caption-reveal')];
  const canvas = section.querySelector('.achievement-rays-canvas'), flash = section.querySelector('.achievement-flash');
  const heading = section.querySelector('.achievement-heading');
  const sparkles = [...section.querySelectorAll('.achievement-sparkles i')];
  let closingNow;
  let frame = 0;
  let inView = false;
  let progress;
  let entrance;
  let lastTime = 0;
  const rays = createRaysRenderer(section.querySelector('.achievement-rays-canvas'), signal, schedule, { luminous: root.classList.contains('november') });
  function fit() {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    const scale = achievementsSceneScale(width, height, fitScale(width, height, achievementsFrame.width, achievementsFrame.height, 'achievements'));
    placeComposition(composition, scale);
    setTextScale(composition, scale, width, height);
    rays.resize(width, height);
    schedule();
  }
  function update(now) {
    frame = 0;
    if (signal.aborted || !inView || document.hidden) return;
    const box = section.getBoundingClientRect();
    const viewport = stage.clientHeight;
    const portrait = isPortrait(stage.clientWidth, viewport);
    const direct = portrait || reducedMotion.matches;
    const playback = achievementPlayback(box.top, box.height, viewport, hasCoins, portrait);
    const target = reducedMotion.matches ? 1 : playback.progress;
    const starTarget = reducedMotion.matches ? 1 : achievementTransition(box.top, viewport).star;
    const delta = lastTime ? Math.min(64, Math.max(1, now - lastTime)) : 16;
    lastTime = now;
    if (progress === undefined || direct) progress = target;
    else progress += (target - progress) * (1 - Math.exp(-delta / 65));
    if (entrance === undefined || direct) entrance = starTarget;
    else entrance += (starTarget - entrance) * (1 - Math.exp(-delta / 100));
    const settling = Math.abs(target - progress) > .0001 || Math.abs(starTarget - entrance) > .0001 || closingNow === undefined || Math.abs((reducedMotion.matches ? 0 : playback.closing) - closingNow) > .0005;
    if (!settling) { progress = target; entrance = starTarget; }
    // Надпись для холста посчитаем после того, как обновим её стиль (ниже).
    let raysOffset = stage.getBoundingClientRect().top;
    const information = achievementInformation(progress, counter.dataset.value, lines.length);
    const closingTarget = reducedMotion.matches ? 0 : playback.closing;
    // Вход в блок (в том числе снизу, при обратном скролле) — сразу в нужную фазу,
    // без «вспышки» целой звезды перед повторным улётом.
    if (closingNow === undefined || direct) closingNow = closingTarget;
    closingNow += (closingTarget - closingNow) * (1 - Math.exp(-delta / 65));
    if (Math.abs(closingTarget - closingNow) < .0005) closingNow = closingTarget;
    const out = achievementClosing(closingNow, getQuality() === 'lite' || isPortrait(innerWidth, innerHeight));
    const transform = `translateY(${(1 - entrance) * 60}px) rotate(${(1 - entrance) * -3 - (1 - information.shape) * 12 + out.spin}deg) scale(${(.85 + entrance * .15) * (.65 + information.shape * .35) * out.zoom})`;
    for (const element of [focal, number]) {
      element.style.transform = transform;
    }
    focal.style.opacity = entrance * information.shape * out.fade;
    number.style.opacity = entrance * information.number * out.fade;
    // Погасшую звезду не рисуем вовсе: её увеличенный слой не держит память.
    focal.style.visibility = number.style.visibility = out.fade < .01 ? 'hidden' : 'visible';
    canvas.style.transform = closingNow ? `scale(${out.rays.scale}) rotate(${out.rays.spin}deg)` : '';
    canvas.style.opacity = out.rays.opacity;
    canvas.style.visibility = out.rays.opacity < .01 ? 'hidden' : '';
    flash.style.opacity = out.flash;
    // «ачивки» выезжает из-за звезды вместе с её появлением и уходит вверх на пролёте.
    heading.style.opacity = entrance * information.shape * out.fade;
    heading.style.transform = `translate(-50%, ${(1 - information.shape) * 160 - closingNow * 260}px) scale(${.9 + .1 * information.shape})`;
    // На телефоне холст лучей лежит ПОВЕРХ сцены: под текстом он заставлял Safari держать
    // весь макет в отдельных огромных слоях (+0,6 ГБ, вылеты). «Ачивки» тогда рисуем на холсте.
    let label = null;
    if (getQuality() === 'lite') {
      // Итоговая прозрачность — с учётом родителей; холст сам полупрозрачен, это делим обратно.
      let alpha = Number(heading.style.opacity) || 0;
      for (let el = heading.parentElement; el && el !== section; el = el.parentElement) alpha *= Number(getComputedStyle(el).opacity);
      alpha /= Math.max(.01, Number(canvas.style.opacity) || 1);
      if (alpha > .005) {
        const r = screenRect(heading), cs = getComputedStyle(heading);
        const size = parseFloat(cs.fontSize) * r.height / Math.max(1, heading.offsetHeight);
        label = { text: heading.textContent, font: cs.fontFamily, x: r.left + r.width / 2, y: r.top + r.height / 2, size, alpha, cx: innerWidth / 2, cy: innerHeight / 2, scale: closingNow ? out.rays.scale : 1, spin: closingNow ? out.rays.spin : 0 };
      }
    }

    // Искры вылетают, когда цифра встала.
    const burst = Math.max(0, Math.min(1, (progress - .72) / .22)), glow = Math.sin(Math.PI * burst);
    sparkles.forEach((el, i) => {
      el.style.transform = `rotate(var(--a)) translateY(${-(420 + (320 + (i % 3) * 120) * burst)}px) rotate(${burst * 180}deg) scale(${(.3 + glow) * (i % 2 ? .65 : 1)})`;
      el.style.opacity = glow;
    });
    // Искры на телефоне тоже рисуются на холсте (он поверх сцены).
    if (label !== undefined && getQuality() === 'lite') {
      const sparks = [];
      if (glow > .01 && focal.style.visibility !== 'hidden') {
        const turn = Number(/rotate\((-?[\d.]+)deg\)/.exec(focal.style.transform)?.[1] || 0);
        const fade = (Number(focal.style.opacity) || 0) / Math.max(.01, Number(canvas.style.opacity) || 1);
        sparkles.forEach((el, i) => {
          const r = screenRect(el), rot = (parseFloat(el.style.getPropertyValue('--a')) || 0) + burst * 180 + turn, rad = rot * Math.PI / 180;
          const side = r.width / Math.max(1, Math.abs(Math.cos(rad)) + Math.abs(Math.sin(rad)));
          const n = i + 1, color = n % 4 === 0 ? '250,122,179' : n % 3 === 0 ? '26,195,253' : '248,228,194';
          sparks.push({ x: r.left + r.width / 2, y: r.top + r.height / 2, side, rot, color, alpha: Math.min(1, glow * fade) });
        });
      }
      rays.sparks(sparks);
    }
    rays.draw(progress, raysOffset, label);
    counter.style.transform = `translateY(${(1 - information.number) * 80}px) scale(${.94 + information.number * .06})`;
    digits.forEach((digit, index) => {
      if (digit.textContent !== information.digits[index]) digit.textContent = information.digits[index];
    });
    lines.forEach((line, index) => {
      line.style.transform = `translateY(${(1 - information.lines[index]) * 120}%)`;
    });
    section.dataset.progress = progress.toFixed(4);
    section.dataset.entrance = entrance.toFixed(4);
    section.dataset.closing = playback.closing.toFixed(4);
    section.dataset.information = progress < .34 ? 'shape' : progress < .70 ? 'counter' : progress < 1 ? 'caption' : 'complete';
    if (settling) schedule();
  }
  function schedule() { if (!frame && inView && !document.hidden && !signal.aborted) frame = requestAnimationFrame(update); }
  const observer = new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting;
    section.classList.toggle('is-motion-active', inView);
    if (!inView) {
      cancelAnimationFrame(frame); frame = 0; lastTime = 0;
      progress = entrance = closingNow = undefined;
      rays.clear();
      focal.style.opacity = number.style.opacity = 0;
    }
    else schedule();
  }, { rootMargin: '200px' });
  observer.observe(section);
  const resize = new ResizeObserver(fit);
  resize.observe(stage);
  fit();
  window.addEventListener('scroll', schedule, { passive: true, signal });
  document.addEventListener('visibilitychange', () => { lastTime = 0; schedule(); }, { signal });
  reducedMotion.addEventListener('change', schedule, { signal });
  signal.addEventListener('abort', () => { observer.disconnect(); resize.disconnect(); cancelAnimationFrame(frame); }, { once: true });
}
