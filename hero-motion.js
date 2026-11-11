import { requestRenderFrame as requestAnimationFrame, cancelRenderFrame as cancelAnimationFrame } from './performance.js';
import { mountHeroFilm } from './hero-film.js';
import { resourceUrl } from './resources.js';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const preparedFrames = new WeakMap();

// Decode only the first look-ahead window behind the loading screen.
export async function prepareHeroMotion(root, data, signal) {
  const hero = root.querySelector('.hero');
  const media = data.intro;
  if (!hero || !media || media.mode === 'video' || data.year !== media.mediaYear || reducedMotion.matches) return;
  const frames = await Promise.all(Array.from({ length: Math.min(8, media.frameCount) }, async (_, i) => {
    const image = new Image();
    image.src = resourceUrl(new URL(`${String(i).padStart(5, '0')}.webp`, media.frameBase));
    await image.decode();
    return [i, image];
  }));
  signal.throwIfAborted();
  preparedFrames.set(hero, new Map(frames));
  const canvas = hero.querySelector('.hero-sequence');
  canvas.getContext('2d')?.drawImage(frames[0][1], 0, 0, canvas.width, canvas.height);
  hero.classList.add('is-sequence-playing');
}

// Play the supplied transparent image sequence once, then retain its final frame.
// Only a short look-ahead window stays decoded, rather than all 124 full-size images.
export function mountHeroMotion(root, data, signal) {
  const hero = root.querySelector('.hero');
  const media = data.intro;
  if (!hero || !media || data.year !== media.mediaYear) return;
  if (media.mode === 'video') { mountHeroFilm(hero, signal); return; }
  const canvas = hero.querySelector('.hero-sequence');
  const context = canvas.getContext('2d');
  if (!context) return;
  const cache = preparedFrames.get(hero) || new Map();
  preparedFrames.delete(hero);
  const pending = new Map();
  let visible = false;
  let frame = 0;
  let index = 0;
  let lastDraw = 0;
  let failed = false;
  let complete = false;
  const storyVisible = () => !hero.hasAttribute('data-in-story') || hero.dataset.storyActive === 'true';
  const release = () => cache.clear();
  const schedule = () => {
    if (!frame && visible && storyVisible() && !complete && !failed && !signal.aborted && !document.hidden && !reducedMotion.matches) frame = requestAnimationFrame(update);
  };
  function load(i) {
    if (i >= media.frameCount || pending.has(i) || cache.has(i) || signal.aborted) return;
    const image = new Image();
    image.decoding = 'async';
    pending.set(i, image);
    image.onload = async () => {
      try { await image.decode(); } catch { /* onload still supplies a drawable image */ }
      pending.delete(i);
      if (signal.aborted || failed || complete) return;
      cache.set(i, image);
      schedule();
    };
    image.onerror = () => {
      pending.delete(i);
      failed = true;
      hero.classList.remove('is-sequence-playing');
      hero.classList.add('is-sequence-fallback');
      hero.dataset.sequence = 'poster';
      release();
    };
    image.src = resourceUrl(new URL(`${String(i).padStart(5, '0')}.webp`, media.frameBase));
  }
  function update(now) {
    frame = 0;
    if (signal.aborted || failed || !visible || !storyVisible() || document.hidden || reducedMotion.matches) { lastDraw = 0; return; }
    for (let i = index; i < Math.min(index + 8, media.frameCount); i++) load(i);
    const image = cache.get(index);
    if (image && (!lastDraw || now - lastDraw >= 1000 / media.fps)) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      hero.classList.add('is-sequence-playing');
      hero.dataset.sequence = 'playing';
      hero.dataset.sequenceFrame = String(index);
      const interval = 1000 / media.fps;
      lastDraw = lastDraw ? now - ((now - lastDraw) % interval) : now;
      cache.delete(index);
      if (++index === media.frameCount) {
        complete = true;
        hero.dataset.sequence = 'complete';
        release();
      }
    }
    schedule();
  }
  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    hero.classList.toggle('is-hero-active', visible && storyVisible());
    if (!visible) { cancelAnimationFrame(frame); frame = 0; lastDraw = 0; }
    else schedule();
  }, { threshold: .04 });
  observer.observe(hero);
  hero.addEventListener('story:hero-visibility', () => {
    if (!storyVisible()) { cancelAnimationFrame(frame); frame = 0; lastDraw = 0; }
    else schedule();
  }, { signal });
  function preferenceChanged() {
    hero.classList.toggle('is-sequence-fallback', reducedMotion.matches || failed);
    if (reducedMotion.matches) {
      cancelAnimationFrame(frame); frame = 0;
      hero.classList.remove('is-sequence-playing');
    } else if (complete) hero.classList.add('is-sequence-playing');
    else { lastDraw = 0; schedule(); }
  }
  reducedMotion.addEventListener('change', preferenceChanged, { signal });
  document.addEventListener('visibilitychange', () => { lastDraw = 0; schedule(); }, { signal });
  signal.addEventListener('abort', () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    release();
    pending.forEach(image => { image.onload = image.onerror = null; image.src = ''; });
    pending.clear();
  }, { once: true });
}
