// Загрузка картинок и отрисовка поля на canvas.
import { ROUND as R, STAMPS, asset } from './config.js';
import { windAt } from './engine.js';

const FILES = [...new Set(['scenery.webp', 'character.webp', 'character-mask.svg', 'hat.webp', 'hat-mask.svg', 'hat-red.svg', 'blot.webp', ...STAMPS.flatMap(s => [s.frame, s.image])])];

export async function loadImages(onProgress, signal) {
  let done = 0;
  const pairs = await Promise.all(FILES.map(async name => {
    const img = new Image();
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => finish(new Error(`Loading timeout: ${name}`)), 30000);
      const abort = () => finish(signal.reason);
      function finish(err) { clearTimeout(timer); signal.removeEventListener('abort', abort); img.onload = img.onerror = null; err ? reject(err) : resolve(); }
      img.onload = () => finish();
      img.onerror = () => finish(new Error(`Could not load ${name}`));
      signal.addEventListener('abort', abort, { once: true });
      img.src = asset(name);
    });
    // decode() только ускоряет первый кадр; в фоновой вкладке он может не завершиться.
    await Promise.race([img.decode().catch(() => {}), new Promise(r => setTimeout(r, 1500))]);
    signal.throwIfAborted();
    onProgress(++done / FILES.length);
    return [name, img];
  }));
  await Promise.all([...document.fonts].map(f => f.load().catch(() => {})));
  return Object.fromEntries(pairs);
}

function cover(ctx, img, x, y, w, h) {
  const k = Math.max(w / img.naturalWidth, h / img.naturalHeight), sw = w / k, sh = h / k;
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
}

export function stampSprites(images) {
  return STAMPS.map(s => {
    const c = document.createElement('canvas'); c.width = 180; c.height = 240;
    const ctx = c.getContext('2d');
    ctx.drawImage(images[s.frame], 0, 0, 180, 240);
    cover(ctx, images[s.image], 180 * .115, 240 * .095, 180 * .77, 240 * .81);
    return c;
  });
}

const piplikCache = new WeakMap();
export function piplik(images) {
  if (piplikCache.has(images)) return piplikCache.get(images);
  const c = document.createElement('canvas'); c.width = 607; c.height = 698;
  const ctx = c.getContext('2d');
  ctx.drawImage(images['character.webp'], 23.97, 70.31, 587.625, 587.625);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(images['character-mask.svg'], 27.558, 106.423, 579.753, 547.671);
  ctx.globalCompositeOperation = 'source-over';
  const hat = document.createElement('canvas'); hat.width = 607; hat.height = 698;
  const h = hat.getContext('2d');
  h.drawImage(images['hat.webp'], -58.02, -10.28, 744.773, 744.773);
  h.globalCompositeOperation = 'destination-in';
  h.drawImage(images['hat-mask.svg'], 0, 0, 462.729, 242.382);
  ctx.drawImage(hat, 0, 0);
  ctx.drawImage(images['hat-red.svg'], 86.67, 26.81, 311.424, 143.589);
  piplikCache.set(images, c);
  return c;
}

export function createRenderer(canvas, images) {
  const ctx = canvas.getContext('2d', { alpha: true });
  const sprites = stampSprites(images), hero = piplik(images);
  let k = 1;
  function resize(w, h) {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    k = canvas.width / R.width;
  }
  function draw(s, reduced = false, idle = false) {
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.clearRect(0, 0, R.width, R.height);
    const wind = windAt(s.elapsed);
    if (!idle && !reduced && wind.strength > 0) {
      ctx.save(); ctx.strokeStyle = '#f8e4c2'; ctx.globalAlpha = wind.strength * .35; ctx.lineWidth = 2;
      for (let i = 0; i < 10; i++) {
        const x = ((s.elapsed * wind.direction * 160 + i * 91) % 680 + 680) % 680 - 70, y = 200 + i * 103 % 550;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + wind.direction * 48, y - 5); ctx.stroke();
      }
      ctx.restore();
    }
    for (const p of s.puddles) {
      const arming = s.elapsed < p.armed;
      ctx.save();
      ctx.globalAlpha = p.triggered ? .35 : arming ? .45 : Math.min(1, (p.expires - s.elapsed) / .35);
      ctx.drawImage(images['blot.webp'], p.x - 59, 904, 118, 40);
      if (arming) { ctx.strokeStyle = '#f8e4c2'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(p.x, 924, 62, 21, 0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore();
    }
    for (const it of s.items) {
      ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(reduced ? 0 : it.angle);
      if (it.hazard) ctx.drawImage(images['blot.webp'], -it.width / 2, -it.height / 2, it.width, it.height);
      else {
        ctx.shadowColor = it.express ? '#1ac3fd' : '#200b0b44';
        ctx.shadowBlur = it.express ? 26 : 10; ctx.shadowOffsetY = 5;
        ctx.drawImage(sprites[it.variant], -it.width / 2, -it.height / 2, it.width, it.height);
        if (it.express) {
          ctx.shadowBlur = 0; ctx.fillStyle = '#1ac3fd';
          ctx.beginPath(); ctx.roundRect(-27, -it.height / 2 - 24, 54, 26, 13); ctx.fill();
          ctx.fillStyle = '#ef3124'; ctx.font = '22px Agse, serif'; ctx.textAlign = 'center';
          ctx.fillText('+3', 0, -it.height / 2 - 4);
        }
      }
      ctx.restore();
    }
    const hit = !idle && s.elapsed < s.hitUntil, caught = !idle && s.elapsed < s.catchUntil;
    ctx.save(); ctx.translate(s.playerX, R.playerY);
    if (!reduced) { ctx.rotate(hit ? Math.sin(s.elapsed * 70) * .06 : (s.targetX - s.playerX) / 1300); ctx.scale(caught ? 1.06 : 1, caught ? .95 : 1); }
    if (hit) ctx.globalAlpha = .6 + Math.sin(s.elapsed * 50) * .25;
    ctx.drawImage(hero, -R.playerWidth / 2, 0, R.playerWidth, R.playerHeight);
    ctx.restore();
    for (const e of s.effects) {
      const t = e.age / .8;
      ctx.save(); ctx.globalAlpha = 1 - t;
      ctx.font = '40px Agse, serif'; ctx.textAlign = 'center'; ctx.lineWidth = 5;
      ctx.strokeStyle = e.hazard ? '#f8e4c2' : '#020101'; ctx.fillStyle = e.hazard ? '#020101' : '#f8e4c2';
      ctx.strokeText(e.text, e.x, e.y - t * 95); ctx.fillText(e.text, e.x, e.y - t * 95);
      if (!reduced && !e.hazard) {
        ctx.fillStyle = '#1ac3fd';
        for (let i = 0; i < 5; i++) { const a = i * Math.PI * .4; ctx.fillRect(e.x + Math.cos(a) * t * 66, e.y - 30 + Math.sin(a) * t * 50, 5, 5); }
      }
      ctx.restore();
    }
  }
  return { draw, resize };
}
