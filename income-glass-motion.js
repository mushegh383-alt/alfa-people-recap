import { requestRenderFrame as requestAnimationFrame, cancelRenderFrame as cancelAnimationFrame, getQuality } from './performance.js';
import { incomeGlassPose, incomeGlassDigits, incomeGlassGeometry, incomeGlassProgress, incomeGlassHandoff } from './income-glass-layout.js';
import { createIncomeGlassRenderer } from './income-glass-renderer.js';

const prepared = new WeakMap();
export const getIncomeGlassRenderer = section => prepared.get(section)?.renderer;

// Телефон: WebGL-холст шара лежит поверх сцены (см. performance.css — под текстом он заставлял
// Safari держать весь макет в огромных слоях). Золотой колпачок под холстом виден через вырез
// по его форме.
const capMask = new URL('./assets/income-glass/cap-mask.svg', import.meta.url).href;
export function syncIncomeCapWindow(section) {
  if (getQuality() !== 'lite') return;
  const canvas = section.querySelector('.income-glass-canvas'), cap = section.querySelector('.income-glass-cap');
  if (!canvas || !cap) return;
  let mask = 'none';
  if ((Number(cap.style.opacity) || 0) > .01) {
    const r = cap.getBoundingClientRect(), v = canvas.getBoundingClientRect();
    mask = `linear-gradient(#000 0 0), url("${capMask}") ${(r.left - v.left).toFixed(1)}px ${(r.top - v.top).toFixed(1)}px / ${r.width.toFixed(1)}px ${r.height.toFixed(1)}px no-repeat`;
  }
  if (canvas.dataset.capMask !== mask) { canvas.dataset.capMask = mask; canvas.style.webkitMask = mask; canvas.style.mask = mask; if (mask !== 'none') { canvas.style.webkitMaskComposite = 'xor'; canvas.style.maskComposite = 'exclude'; } }
}

export function prepareIncomeGlass(root, signal) {
  const section = root.querySelector('.income-glass');
  if (!section) return;
  const canvas = section.querySelector('canvas');
  let renderer = null;
  try { renderer = createIncomeGlassRenderer(canvas, section.dataset.caption, section.querySelector('.income-glass-title').textContent, section.querySelector('.income-glass-rank').textContent); }
  catch (error) { console.warn('Glass sphere uses the static fallback:', error.message); }
  section.classList.toggle('has-glass-renderer', Boolean(renderer));
  const state = { renderer };
  prepared.set(section, state);
  // Браузер может отобрать WebGL (нехватка памяти GPU, много вкладок) — тогда шар
  // оставался плоским без отражений до перезагрузки. Теперь при потере контекста
  // шар пересоздаётся на новом холсте (getContext у потерянного холста не вернуть).
  let lost = false, reviveTimer = 0;
  const text = sel => section.querySelector(sel).textContent;
  function bindLoss(target) {
    target.addEventListener('webglcontextlost', event => {
      event.preventDefault(); lost = true;
      section.classList.remove('has-glass-renderer');
      clearTimeout(reviveTimer); reviveTimer = setTimeout(state.revive, 500);
    }, { signal });
  }
  state.revive = () => {
    if (signal.aborted || document.hidden || (state.renderer && !lost)) return;
    let target = section.querySelector('.income-glass-canvas');
    if (lost && target) { const fresh = target.cloneNode(false); target.replaceWith(fresh); target = fresh; bindLoss(fresh); }
    try { state.renderer?.destroy(); } catch {}
    try { state.renderer = createIncomeGlassRenderer(target, section.dataset.caption, text('.income-glass-title'), text('.income-glass-rank')); lost = false; }
    catch (error) { state.renderer = null; console.warn('Glass sphere stays flat:', error.message); }
    section.classList.toggle('has-glass-renderer', Boolean(state.renderer));
    dispatchEvent(new Event('resize'));          // сцена (или открывающая история) заново задаст размер
  };
  bindLoss(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && lost) state.revive(); }, { signal });
  signal.addEventListener('abort', () => {
    clearTimeout(reviveTimer);
    state.renderer?.destroy();
    prepared.delete(section);
  }, { once: true });
}

export function mountIncomeGlass(root, signal) {
  const section = root.querySelector('.income-glass');
  if (!section) return;
  if (!prepared.has(section)) prepareIncomeGlass(root, signal);
  const state = prepared.get(section);
  const viewport = section.querySelector('.income-glass-viewport');
  const stage = section.querySelector('.income-glass-stage');
  const world = section.querySelector('.income-glass-world');
  const fallbackWorld = section.querySelector('.income-glass-fallback-world');
  const title = section.querySelector('.income-glass-title');
  const rank = section.querySelector('.income-glass-rank');
  const cap = section.querySelector('.income-glass-cap');
  const fallbackNumber = section.querySelector('.income-glass-fallback-number');
  const fallbackCaption = section.querySelector('.income-glass-fallback-caption');
  const canvas = section.querySelector('canvas');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const intro = root.querySelector('.recap-intro');
  intro?.classList.add('has-income-next');
  const measure = document.createElement('canvas').getContext('2d');
  measure.font = '700px Agse';
  fallbackNumber.style.fontSize = `${700 * Math.min(1, 1200 / measure.measureText('8'.repeat(section.dataset.value.length)).width)}px`;
  let width, height, geometry, top, travel;
  let frame = 0;
  let active = false;
  let current = null;
  let previousHandoff = '';
  function fit() {
    width = viewport.clientWidth;
    height = viewport.clientHeight;
    geometry = incomeGlassGeometry(width, height);
    top = section.getBoundingClientRect().top + scrollY;
    travel = section.offsetHeight;
    stage.style.setProperty('--glass-scale', geometry.scale);
    state.renderer?.resize(width, height);
    title.style.fontSize = '241.199px';
    const headingWidth = title.scrollWidth;
    if (headingWidth > 1754) title.style.fontSize = `${241.199 * 1754 / headingWidth}px`;
    schedule();
  }
  function draw() {
    frame = 0;
    if (signal.aborted || document.hidden) return;
    const handoff = incomeGlassHandoff(scrollY, top, height, reduced.matches);
    const handoffKey = `${handoff.shade.toFixed(4)}:${handoff.orb.toFixed(4)}`;
    if (handoffKey !== previousHandoff) {
      previousHandoff = handoffKey;
      intro?.style.setProperty('--income-shade', handoff.shade);
      viewport.style.setProperty('--income-arrival-red', handoff.red);
      viewport.style.setProperty('--income-orb', handoff.orb);
      viewport.style.setProperty('--income-paper', handoff.shade);
      section.dataset.handoff = handoff.shade.toFixed(4);
    }
    // The inexpensive backdrop update stays active even after a direct jump
    // to the top. GPU rendering still runs only while this scene is in view.
    if (!active) return;
    const target = reduced.matches ? 1 : incomeGlassProgress(scrollY, top, travel, height);
    if (current === null || reduced.matches || Math.abs(target - current) < .00035) current = target;
    else current += (target - current) * .23;
    const pose = incomeGlassPose(current, reduced.matches);
    const digits = incomeGlassDigits(section.dataset.value, current);
    section.dataset.progress = current.toFixed(4);
    section.dataset.digits = digits;
    const dx = (geometry.x - width / 2) * (1 / pose.zoom - 1) / geometry.scale;
    const dy = (geometry.y - height / 2) * (1 / pose.zoom - 1) / geometry.scale;
    world.style.transform = `translate(${dx}px, ${dy}px) scale(${pose.zoom})`;
    fallbackWorld.style.transform = world.style.transform;
    cap.style.opacity = pose.cap;
    title.style.opacity = pose.title;
    title.style.transform = `translateY(${(1 - pose.title) * 110}px)`;
    rank.style.opacity = pose.rank * .49;
    rank.style.transform = `translateY(${(1 - pose.rank) * 30}px)`;
    fallbackNumber.textContent = digits;
    fallbackNumber.style.opacity = pose.number;
    fallbackCaption.style.opacity = pose.caption * .55;
    if (handoff.orb > 0) state.renderer?.draw(pose, geometry, digits, width, height);
    syncIncomeCapWindow(section);
    if (Math.abs(target - current) >= .00035) schedule();
  }
  function schedule() {
    if (!frame && !document.hidden && !signal.aborted) frame = requestAnimationFrame(draw);
  }
  const resize = new ResizeObserver(fit);
  resize.observe(viewport);
  if (intro) resize.observe(intro);
  const observer = new IntersectionObserver(entries => {
    active = entries[0].isIntersecting;
    section.classList.toggle('is-glass-active', active);
    if (active) { state.revive?.(); fit(); schedule(); }
    else { current = null; schedule(); }
  });
  observer.observe(section);
  // Телефон: WebGL-шар с текстурами не держим, пока открывающая история далеко
  // (до 1.5 экрана) — освобождаем контекст и создаём заново на подходе.
  const story = section.closest('.opening-story');
  if (getQuality() === 'lite' && story) {
    const memory = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting && state.renderer) {
        state.renderer.destroy(); state.renderer = null;
      } else if (entry.isIntersecting && !state.renderer) {
        try { state.renderer = createIncomeGlassRenderer(section.querySelector('.income-glass-canvas'), section.dataset.caption, title.textContent, rank.textContent); }
        catch { state.renderer = null; }
        section.classList.toggle('has-glass-renderer', Boolean(state.renderer));
        fit(); schedule();
      }
    }, { rootMargin: '150% 0px' });
    memory.observe(story);
    signal.addEventListener('abort', () => memory.disconnect(), { once: true });
  }
  window.addEventListener('scroll', schedule, { passive: true, signal });
  window.addEventListener('resize', fit, { passive: true, signal });
  document.addEventListener('visibilitychange', schedule, { signal });
  reduced.addEventListener('change', () => { current = null; schedule(); }, { signal });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && active) state.revive?.(); }, { signal });
  signal.addEventListener('abort', () => {
    resize.disconnect(); observer.disconnect(); cancelAnimationFrame(frame);
    intro?.classList.remove('has-income-next');
    intro?.style.removeProperty('--income-shade');
  }, { once: true });
  fit();
}
