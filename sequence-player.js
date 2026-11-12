import { getBudget, onQualityChange } from './performance.js';
import { requestRenderFrame as requestAnimationFrame, cancelRenderFrame as cancelAnimationFrame } from './performance.js';
import { resourceUrl } from './resources.js';
const prepared = new WeakMap();
export function carFrameForProgress(progress, frameCount) {
  return Math.round(Math.max(0, Math.min(1, progress)) * Math.max(0, frameCount - 1));
}
export async function prepareCarSequence(root, data, signal) {
  const canvas = root.querySelector('.car-sequence');
  if (!canvas || !data.parksharing?.sequence) return;
  const meta = data.parksharing.sequence;
  const images = await Promise.all(Array.from({ length: Math.min(getBudget().decodes, meta.frameCount) }, async (_, i) => {
    const image = new Image(); image.src = resourceUrl(new URL(`frame-${String(i).padStart(4, '0')}.webp`, meta.base));
    await image.decode(); return [i, image];
  }));
  signal.throwIfAborted(); prepared.set(canvas, new Map(images));
  if (canvas instanceof HTMLImageElement) { canvas.src = images[0][1].src; return; }
  canvas.width = Math.min(meta.width,getBudget().mediaWidth); canvas.height = Math.round(canvas.width*meta.height/meta.width);
  canvas.getContext('2d').drawImage(images[0][1], 0, 0, canvas.width, canvas.height);
}
export function mountCarSequence(root, data, signal) {
  const canvas = root.querySelector('.car-sequence');
  if (!canvas || !data.parksharing?.sequence) return;
  const section = canvas.closest('#parksharing');
  const meta = data.parksharing.sequence, cache = prepared.get(canvas) || new Map();
  // Кадры машины показываются картинкой (<img>), а не холстом: холст внутри масштабированной
  // сцены — отдельный GPU-слой, и iPhone держал из-за него ~0,9 ГБ лишней памяти.
  const isImg = canvas instanceof HTMLImageElement;
  const pending = new Map(), failed = new Set(), ctx = isImg ? null : canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  prepared.delete(canvas);
  let requested = 0, displayed = cache.has(0) ? 0 : -1, progress = 0, active = false, raf = 0, direction = 1;
  canvas.dataset.playback = 'scroll'; canvas.dataset.frame = String(Math.max(0, displayed));
  const available = () => active && !document.hidden && !signal.aborted;
  function desired() {
    return [...new Set([requested, requested + direction, requested + direction * 2, requested - direction])].filter(i => i >= 0 && i < meta.frameCount);
  }
  function trim() {
    while (cache.size > getBudget().carCache) {
      const victim = [...cache.keys()].filter(i => i !== requested && i !== displayed).sort((a, b) => Math.abs(b - requested) - Math.abs(a - requested))[0];
      if (victim === undefined) break;
      cache.get(victim)?.close?.();cache.delete(victim);
    }
  }
  // Keep only the newest scroll request queued, with a device-budgeted decode queue.
  // Backwards scrolling reuses nearby frames without retaining the whole film.
  function pump() {
    if (!available()) return;
    for (const index of desired()) {
      if (pending.size >= getBudget().decodes) break;
      if (cache.has(index) || pending.has(index) || failed.has(index)) continue;
      const image = new Image(); pending.set(index, image);
      image.src = resourceUrl(new URL(`frame-${String(index).padStart(4, '0')}.webp`, meta.base));
      image.decode().then(async () => {
        let surface=image;
        if(!isImg&&typeof createImageBitmap==='function'){
          const width=Math.min(image.naturalWidth||meta.width,getBudget().mediaWidth),height=Math.round(width*meta.height/meta.width);
          surface=await createImageBitmap(image,{resizeWidth:width,resizeHeight:height,resizeQuality:'medium'});image.src='';
        }
        pending.delete(index); if (signal.aborted) {surface.close?.();return;}
        if(!active&&index!==displayed){surface.close?.();return;}
        cache.set(index, surface); trim(); schedule(); pump();
      }).catch(() => {
        pending.delete(index); if (signal.aborted) return;
        failed.add(index); if (requested === index) canvas.dataset.error = 'true';
        canvas.dataset.playing = 'false'; pump();
      });
    }
  }
  function draw() {
    raf = 0; if (!available()) return;
    const image = cache.get(requested);
    if (image && displayed !== requested) {
      if (isImg) canvas.src = image.src;
      else { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0, canvas.width, canvas.height); }
      displayed = requested; canvas.dataset.frame = String(displayed); delete canvas.dataset.error;
    }
    canvas.dataset.playing = String(displayed !== requested && !failed.has(requested));
    pump();
  }
  function schedule() { if (!raf && available()) raf = requestAnimationFrame(draw); }
  function seek() {
    const next = reduced.matches ? 0 : carFrameForProgress(progress, meta.frameCount);
    if (next !== requested) direction = next > requested ? 1 : -1;
    requested = next; schedule(); pump();
  }
  section.addEventListener('recap:car-progress', event => { progress = event.detail.progress; seek(); }, { signal });
  const observer = new IntersectionObserver(([entry]) => {
    active = entry.isIntersecting;
    if (active) seek(); else { cancelAnimationFrame(raf); raf = 0; canvas.dataset.playing = 'false';for(const [key,image] of cache)if(key!==displayed){image.close?.();cache.delete(key);} }
  }, { threshold: .02 });
  observer.observe(canvas);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; canvas.dataset.playing = 'false'; }
    else seek();
  }, { signal });
  reduced.addEventListener('change', seek, { signal });
  onQualityChange(()=>{if(!isImg){canvas.width=Math.min(meta.width,getBudget().mediaWidth);canvas.height=Math.round(canvas.width*meta.height/meta.width);}displayed=-1;for(const image of cache.values()){image.close?.();if(image instanceof Image)image.src='';}cache.clear();schedule();},signal);
  signal.addEventListener('abort', () => {
    observer.disconnect(); cancelAnimationFrame(raf);for(const image of cache.values())image.close?.(); cache.clear();
    pending.forEach(image => { image.src = ''; }); pending.clear();
    canvas.dataset.playing = 'false';
  }, { once: true });
}
