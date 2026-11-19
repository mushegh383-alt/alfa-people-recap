import { setHeadingScale } from './typography.js';
import { optimizedAssetUrl } from './resources.js';
import { requestRenderFrame as requestAnimationFrame, cancelRenderFrame as cancelAnimationFrame, getQuality } from './performance.js';
import { momentsFrame, momentsCenter, photoThrow, sparkleCount } from './moments-layout.js';
import { reel } from './november-layout.js';
import { fitScale, isPortrait, placeComposition } from './layout-fit.js';
const photos = [
  { x: 252.383 + 144, y: 1533.67 + 175, angle: 10.2346, index: 1 },
  { x: 1475 + 144, y: 1287.82 + 175, angle: -12.0972, index: 2 },
  { x: 394.734 + 144, y: 597.831 + 175, angle: 14.5933, index: 0 },
];
export function createMoments(data) {
  const section = document.createElement('section');
  section.className = 'moments'; section.id = 'moments';
  section.setAttribute('aria-label', 'Ваши опубликованные моменты');
  section.dataset.value = String(data.moments.count);
  section.innerHTML = `<div class="moments-stage"><div class="moments-composition"><div class="moments-camera"><div class="moments-vector" aria-hidden="true"><img class="moments-back" src="./assets/moments/star-back.svg" alt=""/><img class="moments-core" src="./assets/moments/star-core.svg" alt=""/><div class="moments-lens moments-lens-one"></div><div class="moments-lens moments-lens-two"></div><div class="moments-lens moments-lens-three"></div></div></div><div class="moments-info"><p class="moments-number" aria-hidden="true"></p><h2 class="moments-caption"></h2><p class="sr-only"></p></div></div></div>`;
  const composition = section.querySelector('.moments-composition');
  if (data.moments.star) { section.querySelector('.moments-back').src = data.moments.star; section.querySelector('.moments-core').remove(); }
  for (const photo of photos) {
    const wrapper = document.createElement('div'); wrapper.className = 'moments-photo'; wrapper.dataset.photo = photo.index;
    Object.assign(wrapper.style, { left: `${photo.x - 144}px`, top: `${photo.y - 175}px` });
    const image = document.createElement('img'); image.alt = ''; image.src = optimizedAssetUrl(data.moments.photos[photo.index] || `./assets/moments/photo-${photo.index}.svg`);
    image.setAttribute('aria-hidden', 'true'); wrapper.append(image); composition.append(wrapper);
  }
  // Вспышка и искры появления
  const flash = document.createElement('div'); flash.className = 'moments-flash'; flash.setAttribute('aria-hidden', 'true');
  const sparkles = document.createElement('div'); sparkles.className = 'moments-sparkles'; sparkles.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < sparkleCount; i++) { const s = document.createElement('i'); s.style.setProperty('--a', `${i / sparkleCount * 360 + (i % 2) * 14}deg`); sparkles.append(s); }
  section.querySelector('.moments-stage').append(flash);
  composition.append(sparkles);
  section.querySelector('.moments-caption').textContent = data.moments.label;
  { const title = document.createElement('h2'); title.className = 'november-heading block-heading moments-heading'; title.setAttribute('aria-hidden', 'true'); title.textContent = data.moments.title || 'моменты'; section.querySelector('.moments-composition').append(title); }
  section.querySelector('.sr-only').textContent = `${data.moments.count} — ${data.moments.label.replaceAll('\n', ' ')}`;
  section.querySelector('.moments-number').style.fontSize = `${Math.min(700, 1950 / Math.max(1, String(data.moments.count).length))}px`;
  return section;
}
// Звёзды — SVG 3200×3400 с 12 гауссовыми размытиями в каждой. Их перерастеризация
// при смене масштаба стоила ~100 мс и давала лаг при листании. Один раз во время
// загрузки рисуем их в растровую картинку: на мягких свечениях разницы не видно.
// Розовый → красный: каждый пиксель перекрашивается по яркости в красную шкалу
// (бордовый → #ef3124 → коралловый блик), объём и прозрачность сохраняются.
// Один раз при загрузке, на прокрутку не влияет.
const RED_RAMP = [[0, [120, 10, 14]], [.3, [239, 49, 36]], [.55, [255, 72, 52]], [.75, [255, 122, 96]], [.9, [255, 184, 162]], [1, [255, 238, 228]]];
// Сердцевина — голубым градиентом, как небо на полароидах (синий → голубой → персиковый блик).
const BLUE_RAMP = [[0, [12, 24, 70]], [.3, [36, 92, 205]], [.55, [40, 150, 240]], [.75, [110, 196, 255]], [.9, [214, 210, 250]], [1, [255, 232, 236]]];
const makeLut = ramp => {
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const l = i / 255; let k = 1; while (k < ramp.length - 1 && ramp[k][0] < l) k++;
    const [a, ca] = ramp[k - 1], [b, cb] = ramp[k], t = (l - a) / Math.max(1e-6, b - a);
    for (let c = 0; c < 3; c++) lut[i * 3 + c] = ca[c] + (cb[c] - ca[c]) * t;
  }
  return lut;
};
const RED_LUT = makeLut(RED_RAMP), BLUE_LUT = makeLut(BLUE_RAMP);
function recolorRed(ctx, width, height, lut = RED_LUT) {
  const image = ctx.getImageData(0, 0, width, height), d = image.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const l = (d[i] * 54 + d[i + 1] * 183 + d[i + 2] * 19) >> 8, j = l * 3;
    d[i] = lut[j]; d[i + 1] = lut[j + 1]; d[i + 2] = lut[j + 2];
  }
  ctx.putImageData(image, 0, 0);
}
async function rasterizeStar(img, signal) {
  const src = img.currentSrc || img.src;
  if (!src || src.startsWith('blob:') || !/\.svg(\?|$)/.test(src)) return;   // готовые растры (новый стиль) не перекрашиваем
  // Без decode(): он растеризует SVG в исходном 3200×3400 (~43 МБ). drawImage
  // рисует вектор сразу в нужном размере. На телефоне 1792 px: при 1024 звезда на экранах с dpr 3 была пиксельной.
  const source = new Image();
  await new Promise((resolve, reject) => { source.onload = resolve; source.onerror = () => reject(new Error('star load')); source.src = src; });
  signal.throwIfAborted();
  const width = getQuality() === 'lite' ? 1792 : 2048, height = Math.round(width * 3400 / 3200);
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(source, 0, 0, width, height);
  recolorRed(ctx, width, height, img.classList.contains('moments-core') ? BLUE_LUT : RED_LUT);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', .92));
  signal.throwIfAborted();
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  img.src = url;
  await img.decode().catch(() => {});
  signal.addEventListener('abort', () => URL.revokeObjectURL(url), { once: true });
}
export async function prepareMoments(root, data, signal) {
  const stars = [...(root?.querySelectorAll('.moments-back, .moments-core') || [])];
  await Promise.all(stars.map(img => rasterizeStar(img, signal).catch(error => {
    if (!signal.aborted) console.warn('Moments star stays vector:', error);
  })));
}
export function mountMoments(section, signal) {
  if (!section) return null;
  const stage = section.querySelector('.moments-stage'), composition = section.querySelector('.moments-composition');
  const camera = section.querySelector('.moments-camera'), back = section.querySelector('.moments-back'), core = section.querySelector('.moments-core');
  const info = section.querySelector('.moments-info'), number = section.querySelector('.moments-number');
  const pictures = photos.map(photo => ({ ...photo, node: section.querySelector(`[data-photo="${photo.index}"]`) }));
  const flash = section.querySelector('.moments-flash'), sparkles = [...section.querySelectorAll('.moments-sparkles i')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let active = false, progress = 0, frame = 0;
  function fit() {
    // Intentionally let the large star cross the viewport. Text has its own
    // camera, and photos can approach without scaling the entire scene.
    const scale = fitScale(stage.clientWidth, stage.clientHeight, 1480, 1820, 'moments');
    // Центр звезды и текста — x 988 в макете 1920 (на 28 px правее середины).
    // На узком экране это заметно, поэтому сдвигаем сцену, чтобы цифра была по центру.
    const shift = isPortrait(stage.clientWidth, stage.clientHeight) ? ' translateX(-28px)' : '';
    placeComposition(composition, scale, `${shift}`);
    setHeadingScale(composition, scale, stage.clientWidth, stage.clientHeight);
    schedule();
  }
  function paint() {
    frame = 0; if (!active || document.hidden || signal.aborted) return;
    const f = momentsFrame(progress, reduced.matches);
    camera.style.transform = `scale(${f.zoom})`;
    back.style.transform = `rotate(${f.backRotation}deg)`;
    if (core) core.style.transform = `rotate(${f.coreRotation}deg)`;
    pictures.forEach(({node, index, x, y, angle}) => {
      const growth = f.growth[index], reveal = f.photos[index], land = f.land[index], away = 1 - land, t = photoThrow[index];
      const tx = (x - momentsCenter.x) * growth * .34 + t.dx * away;
      const ty = (y - momentsCenter.y) * growth * .28 + t.dy * away;
      node.style.transform = `translate3d(${tx}px,${ty}px,0) rotate(${angle + (index % 2 ? -1 : 1) * growth * 5 + t.spin * away}deg) scale(${f.photoScale[index]})`;
      node.style.opacity = Math.min(1, reveal * 4);
    });
    info.style.opacity = f.info;
    const title = section.querySelector('.moments-heading'); if (title) { title.style.opacity = f.info; title.style.transform = `translateY(${(1 - f.info) * 40}px)`; }
    info.style.transform = `translateY(${(1-f.info)*55}px) scale(${.55 + .45 * f.numberPop})`;
    flash.style.opacity = f.flash; flash.style.visibility = f.flash > .005 ? 'visible' : 'hidden';
    const burst = f.sparkles, glow = Math.sin(Math.PI * burst);
    sparkles.forEach((s, i) => {
      const dist = 260 + (720 + (i % 3) * 160) * burst;
      s.style.transform = `rotate(var(--a)) translateY(${-dist}px) rotate(${burst * 220}deg) scale(${(.4 + glow) * (i % 2 ? .7 : 1)})`;
      s.style.opacity = glow; s.style.visibility = glow > .01 ? 'visible' : 'hidden';
    });
    const text = reel(section.dataset.value, f.digits); if (number.textContent !== text) number.textContent = text;
    section.dataset.progress = progress.toFixed(4); section.dataset.zoom = f.zoom.toFixed(4);
    // No idle loop, path rewrites or animated SVG/backdrop filter geometry.
  }
  function schedule() { if (active && !frame && !document.hidden && !signal.aborted) frame = requestAnimationFrame(paint); }
  function draw(p, visible) {
    progress = p; active = visible; section.classList.toggle('is-moments-active', active);
    if (!active) { cancelAnimationFrame(frame); frame = 0; return; }
    schedule();
  }
  const resize = new ResizeObserver(fit); resize.observe(stage); fit();
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(frame); frame=0; } else schedule(); }, { signal });
  reduced.addEventListener('change', schedule, { signal });
  signal.addEventListener('abort', () => { cancelAnimationFrame(frame); resize.disconnect(); }, { once: true });
  return { draw, fit };
}
