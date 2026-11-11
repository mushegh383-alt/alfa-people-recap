// Наполнение «пустых» экранов живой графикой из самих данных.
// Всё рисуется на canvas внутри композиции сцены, без фильтров; заготовки
// (записки, самолётики, открытки) рендерятся один раз и дальше только двигаются.
import { canvasBudget, getQuality } from './performance.js';
import { recapHeadingPixels } from './typography.js';

const clamp = v => Math.max(0, Math.min(1, v));
const smooth = t => t * t * (3 - 2 * t);
const outBack = t => { const c = 1.6; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };
function random(seed) { let s = seed >>> 0; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909), (s >>>= 0) / 4294967296)); }
function sprite(w, h, paint) { const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h); return c; }
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

// ───────────────────────────── «Спасибки» ─────────────────────────────
// Отправленные — бумажные самолётики улетают из левой половины сердца за край;
// полученные — записки прилетают и садятся облаком вокруг правой половины.
const THANKS_WORDS = ['спасибо!', 'ты лучший', 'выручил!', 'огонь 🔥', 'спасибо ❤', 'ты супер', 'респект', 'спас!'];
export function createThanksNotes(section) {
  const composition = section.querySelector('.thanks-composition');
  if (!composition) return null;
  const sent = Number(section.querySelector('.thanks-sent .thanks-digits')?.dataset.value) || 0;
  const received = Number(section.querySelector('.thanks-received .thanks-digits')?.dataset.value) || 0;
  // Холст размером с экран поверх композиции (а не внутри неё): холст с CSS-размером
  // 3320×2520 px макета в масштабированной сцене стоил в WebKit ~0.5 ГБ памяти GPU.
  // Точка макета (x, y) на экране: (W/2 + (x − 958)·s, H/2 + (y − 739)·s).
  const host = section.querySelector('.thanks-scene') || section;
  const canvas = document.createElement('canvas'); canvas.className = 'scene-fill-canvas thanks-notes-canvas'; canvas.setAttribute('aria-hidden', 'true');
  // Внутри композиции между лучами и сердцем: записки выглядывают из-за сердца.
  // CSS-размер холста — ровно экран, с обратным масштабом (1/s): слой GPU остаётся
  // размером с экран, а не 3320×2520 px макета (так было +0.5 ГБ на iPhone).
  composition.insertBefore(canvas, composition.querySelector('.thanks-art'));
  const ctx2 = canvas.getContext('2d');
  let W = 1, H = 1, dpr = 1, S = 1;
  const layer = {
    ctx: ctx2,
    resize(scale) {
      W = host.clientWidth; H = host.clientHeight; S = scale; dpr = canvasBudget(W, H).ratio;
      canvas.width = Math.max(1, Math.round(W * dpr)); canvas.height = Math.max(1, Math.round(H * dpr));
      // Левый верхний угол экрана в координатах макета: (−(W/2 − 958·s)/s, −(H/2 − 739·s)/s).
      Object.assign(canvas.style, { left: `${-(W / 2 - 958 * S) / S}px`, top: `${-(H / 2 - 739 * S) / S}px`, width: `${W}px`, height: `${H}px`, transform: `scale(${1 / S})`, transformOrigin: '0 0' });
    },
    begin() { ctx2.setTransform(1, 0, 0, 1, 0, 0); ctx2.clearRect(0, 0, canvas.width, canvas.height); ctx2.setTransform(dpr * S, 0, 0, dpr * S, dpr * (W / 2 - 958 * S), dpr * (H / 2 - 739 * S)); },
    release() { canvas.width = canvas.height = 1; },
  };
  const heart = { x: 990, y: 760, rx: 780, ry: 560 };
  const cap = getQuality() === 'lite' ? 60 : 90;
  const rnd = random(5564);
  // Заготовки в двойном разрешении: на телефоне записки крупные и должны быть резкими.
  const cards = THANKS_WORDS.map((word, i) => sprite(600, 300, (c, w, h) => {
    c.save(); c.translate(w / 2, h / 2); c.scale(2, 2); c.rotate((i % 2 ? 1 : -1) * .02);
    roundRect(c, -128, -52, 256, 104, 18); c.fillStyle = i % 2 ? '#ffc4dd' : '#ffd6e8'; c.fill();   // только розовые
    c.lineWidth = 4; c.strokeStyle = '#ef3124'; c.stroke();
    c.fillStyle = '#ef3124'; c.font = '700 34px Styrene, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(word, 0, 2);
    c.restore();
  }));
  const plane = sprite(400, 280, (c) => {
    c.translate(200, 140); c.scale(2, 2);
    c.beginPath(); c.moveTo(80, 0); c.lineTo(-70, -48); c.lineTo(-38, 0); c.lineTo(-70, 46); c.closePath();
    c.fillStyle = '#ffd6e8'; c.fill(); c.lineWidth = 4; c.lineJoin = 'round'; c.strokeStyle = '#ef3124'; c.stroke();
    c.beginPath(); c.moveTo(80, 0); c.lineTo(-38, 0); c.lineTo(-56, 22); c.closePath(); c.fillStyle = '#fa7ab3'; c.fill(); c.stroke();
  });
  const make = (count, side) => { const n = Math.min(count, cap); return Array.from({ length: n }, (_, i) => {
    const order = i / Math.max(1, n - 1), jitter = rnd();
    // Полученные садятся облаком вокруг всего сердца, кроме верха (там заголовок);
    // отправленные улетают из левой половины влево-вверх-вниз.
    const angle = side > 0 ? -Math.PI / 2 + .12 + order * (Math.PI * 2 - .24) + (jitter - .5) * .1 : Math.PI - 1.4 + order * 2.8 + (jitter - .5) * .25;
    return { angle, ring: 1.04 + rnd() * .3, spin: (rnd() - .5) * 46, size: side > 0 ? .5 + rnd() * .3 : .85 + rnd() * .45, t0: 2.52 + order * .62 + (rnd() - .5) * .05, card: cards[i % cards.length], wave: rnd() * Math.PI * 2 };
  }); };
  const incoming = make(received, 1), outgoing = make(sent, -1);
  let visibleHalf = 960, visibleHalfH = 740, placedFor = 0, sceneScale = 1, boost = 1;
  // Куда садятся полученные записки: по лучу от сердца наружу — первое место,
  // которое видно на экране, не задевает заголовок и цифры и не налезает на соседей.
  function place(scale) {
    const cb = composition.getBoundingClientRect(), toDesign = r => ({ l: (r.left - cb.left) / scale, t: (r.top - cb.top) / scale, r: (r.right - cb.left) / scale, b: (r.bottom - cb.top) / scale });
    const text = ['.thanks-title', '.thanks-stats'].map(sel => section.querySelector(sel)).filter(Boolean).map(el => toDesign(el.getBoundingClientRect()));
    const cx = 960, cy = 739, minX = cx - visibleHalf + 30, maxX = cx + visibleHalf - 30, minY = cy - visibleHalfH + 30, maxY = cy + visibleHalfH - 30;
    const taken = [];
    for (const n of incoming) {
      n.x = n.y = null;
      const hw = 150 * n.size * boost * .92, hh = 75 * n.size * boost * .92;
      for (let f = .95; f < 2.6; f += .06) {
        const x = heart.x + Math.cos(n.angle) * heart.rx * f, y = heart.y + Math.sin(n.angle) * heart.ry * f;
        if (x - hw < minX || x + hw > maxX || y - hh < minY || y + hh > maxY) continue;
        if (text.some(b => x + hw > b.l - 20 && x - hw < b.r + 20 && y + hh > b.t - 16 && y - hh < b.b + 16)) continue;
        if (taken.some(q => Math.abs(q.x - x) < (hw + q.hw) * .78 && Math.abs(q.y - y) < (hh + q.hh) * .78)) continue;
        n.x = x; n.y = y; taken.push({ x, y, hw, hh }); break;
      }
    }
  }
  return {
    resize(scale, width, height) { layer.resize(scale); visibleHalf = width / Math.max(.01, scale) / 2; visibleHalfH = (height || width) / Math.max(.01, scale) / 2; sceneScale = scale; placedFor = 0;
      // Телефон: записка на экране ~110 px шириной (было 40–60 px — не читалось).
      boost = (width / Math.max(1, height || width) < .8) ? Math.max(1, Math.min(3.4, 110 / (300 * .65 * scale))) : 1; },
    draw(u) {
      // Места считаем, когда сцена уже видна: у скрытой сцены текст не размечен.
      if (!placedFor && section.querySelector('.thanks-title')?.getBoundingClientRect().width) { place(sceneScale); placedFor = 1; }
      layer.begin();
      const { ctx } = layer;
      // На вертикальном экране сердце во всю ширину — облако тянется вверх и вниз,
      // в свободные зоны над и под сердцем.
      const rx = Math.min(heart.rx, (visibleHalf - 170) / 1.34), ry = Math.max(heart.ry, Math.min(visibleHalfH * .66, 1150) / 1.2);
      for (const n of incoming) {
        const t = clamp((u - n.t0) / .22); if (t <= 0 || n.x === null) continue;
        // Прилетает из-за края по тому же лучу и садится на своё место.
        const e = outBack(t), fx = heart.x + Math.cos(n.angle) * heart.rx * 3.2, fy = heart.y + Math.sin(n.angle) * heart.ry * 3.2;
        const x = fx + (n.x - fx) * e, y = fy + (n.y - fy) * e;
        ctx.save(); ctx.translate(x, y); ctx.rotate((n.spin * (1 + (1 - e) * 6)) * Math.PI / 180);
        const s = n.size * boost * (.6 + .4 * Math.min(1, e)); ctx.globalAlpha = Math.min(1, t * 3);
        ctx.drawImage(n.card, -150 * s, -75 * s, 300 * s, 150 * s); ctx.restore();
      }
      for (const n of outgoing) {
        const t = clamp((u - n.t0) / .38); if (t <= 0 || t >= 1) continue;
        const e = smooth(t), r = .25 + e * 3.1, bend = Math.sin(t * Math.PI) * .35;
        const a = n.angle + bend * (n.wave > Math.PI ? 1 : -1);
        const x = heart.x - 260 + Math.cos(a) * rx * r, y = heart.y + Math.sin(a) * ry * r;
        // Самолётик смотрит по направлению полёта.
        const dir = Math.atan2(Math.sin(a) * ry, Math.cos(a) * rx) + bend * .8;
        ctx.save(); ctx.translate(x, y); ctx.rotate(dir);
        const s = n.size * Math.min(boost, 2.2) * (.7 + .5 * e); ctx.globalAlpha = Math.min(1, t * 5) * (1 - smooth(clamp((t - .75) / .25)));
        ctx.drawImage(plane, -100 * s, -70 * s, 200 * s, 140 * s); ctx.restore();
      }
      ctx.globalAlpha = 1;
    },
    release: layer.release,
  };
}

// ───────────────────────────── «Открытки» ─────────────────────────────
// По свободным краям сцены (по бокам на ПК, сверху и снизу на телефоне) висят
// гирлянды-верёвки с огоньками. Конверт открывается — полученные открытки
// вылетают и цепляются прищепками; «отправленные» со штемпелем улетают за край.
const CARD_ART = ['snow', 'star', 'heart', 'tree', 'snow', 'heart'];
function drawCardArt(c, kind, x, y, r, color) {
  c.save(); c.translate(x, y); c.fillStyle = color; c.strokeStyle = color; c.lineWidth = r * .16; c.lineCap = 'round';
  if (kind === 'snow') for (let i = 0; i < 3; i++) { c.rotate(Math.PI / 3); c.beginPath(); c.moveTo(-r, 0); c.lineTo(r, 0); c.stroke(); }
  else if (kind === 'star') { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.fill(); }
  else if (kind === 'heart') { c.beginPath(); c.moveTo(0, r * .8); c.bezierCurveTo(-r * 1.3, -r * .1, -r * .6, -r * 1.1, 0, -r * .35); c.bezierCurveTo(r * .6, -r * 1.1, r * 1.3, -r * .1, 0, r * .8); c.fill(); }
  else { c.beginPath(); c.moveTo(0, -r); c.lineTo(r * .75, r * .55); c.lineTo(-r * .75, r * .55); c.closePath(); c.fill(); c.fillRect(-r * .12, r * .55, r * .24, r * .35); }
  c.restore();
}
function postcardSprite(i, sent) {
  return sprite(240, 170, (c) => {
    c.save(); c.translate(120, 85);
    c.fillStyle = 'rgba(2,1,1,.35)'; roundRect(c, -100, -66, 208, 140, 10); c.fill();        // тень без размытия
    roundRect(c, -106, -72, 208, 140, 10); c.fillStyle = i % 3 === 1 ? '#ffd3e6' : '#f8e4c2'; c.fill();
    c.lineWidth = 4; c.strokeStyle = '#ef3124'; c.stroke();
    const accent = ['#ef3124', '#fa7ab3', '#1ac3fd'][i % 3];
    drawCardArt(c, CARD_ART[i % CARD_ART.length], -52, -2, 34, accent);
    c.fillStyle = '#ef312466'; for (let k = 0; k < 3; k++) c.fillRect(6, -20 + k * 20, 70 - k * 14, 6);   // «строчки»
    c.fillStyle = accent; c.fillRect(56, -62, 34, 40); c.strokeStyle = '#f8e4c2'; c.lineWidth = 3; c.setLineDash([4, 4]); c.strokeRect(58, -60, 30, 36); c.setLineDash([]);
    if (sent) { c.rotate(-.25); c.strokeStyle = '#1ac3fd'; c.lineWidth = 5; roundRect(c, -78, -24, 156, 48, 8); c.stroke(); c.fillStyle = '#1ac3fd'; c.font = '700 26px Styrene, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('ОТПРАВЛЕНО', 0, 2); }
    c.restore();
  });
}
export function createPostcardGarland(section) {
  const stage = section.querySelector('.envelope-stage');
  if (!stage) return null;
  const received = Number(section.querySelector('.envelope-received')?.dataset.value) || 0;
  const sent = Number(section.querySelector('.envelope-sent')?.dataset.value) || 0;
  const canvas = document.createElement('canvas'); canvas.className = 'scene-fill-canvas garland-canvas'; canvas.setAttribute('aria-hidden', 'true');
  stage.append(canvas);
  const ctx = canvas.getContext('2d');
  const cards = Array.from({ length: 6 }, (_, i) => postcardSprite(i, false)), stamped = Array.from({ length: 3 }, (_, i) => postcardSprite(i + 1, true));
  const rnd = random(1515);
  const keep = Math.min(received, 24), fly = Math.min(sent, getQuality() === 'lite' ? 12 : 18);
  const flyers = Array.from({ length: fly }, () => ({ a: rnd() * Math.PI * 2, spin: (rnd() - .5) * 2, s: .8 + rnd() * .4 }));
  let W = 1, H = 1, dpr = 1, ropes = [], slots = [], source = { x: 0, y: 0 }, card = 80;
  function resize(scale, shift = 0) {
    W = stage.clientWidth; H = stage.clientHeight; dpr = canvasBudget(W, H).ratio;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    // Где на экране видео с конвертом — гирлянды висят вне этой рамки.
    // Композиция сдвинута вниз на запас под заголовок (shift — в px макета).
    const cw = 1920 * scale, ch = 2059 * scale, left = (W - cw) / 2, top = (H - ch) / 2 + shift * scale;
    const headingTop = top - 400 * scale, headingBottom = headingTop + recapHeadingPixels(W, H) * 1.15;
    source = { x: W / 2, y: top + ch * .42 };
    // Раскладка — по реальному свободному месту, а не по ориентации экрана:
    // по бокам только если сбоку хватает места (на почти квадратных окнах его нет).
    const sideCard = Math.min(124, Math.min(left * .44, H * .12));
    ropes = [];
    if (sideCard >= 70 && left >= sideCard * 2.4) {
      card = sideCard;
      const side = Math.max(card * 1.4, left), rows = [.1, .4, .7];
      for (const r of rows) {
        ropes.push({ x0: -10, y0: H * r, x1: side - card * .15, y1: H * (r + .06), sag: card * .6 });
        ropes.push({ x0: W - side + card * .15, y0: H * (r + .06), x1: W + 10, y1: H * r, sag: card * .6 });
      }
    } else {
      // Горизонтальные верёвки во всю ширину: над конвертом и под ним.
      card = Math.max(46, Math.min(110, W * (W / Math.max(1, H) < .8 ? .19 : .085)));
      const sag = card * .45, hang = card * .78 + sag;           // сколько занимает верёвка с открытками
      const envelopeTop = top + ch * .08, envelopeBottom = top + ch * .9;   // верх — кончик ромбовой открытки
      // Верх: в просвете между заголовком и конвертом, иначе — над заголовком.
      if (envelopeTop - (headingBottom + 6) >= hang) ropes.push({ x0: -10, y0: headingBottom + 6, x1: W + 10, y1: headingBottom + 6, sag });
      else if (headingTop - hang - 8 > 6) ropes.push({ x0: -10, y0: headingTop - hang - 8, x1: W + 10, y1: headingTop - hang - 8, sag });
      // Низ: под конвертом, а если места мало — по нижнему краю экрана.
      const y2 = Math.min(Math.max(envelopeBottom, H - (H - envelopeBottom) * .5 - hang * .55), H - hang - 4);
      ropes.push({ x0: -10, y0: y2, x1: W + 10, y1: y2, sag });
    }
    // Слоты прищепок равномерно по всем верёвкам.
    // Равномерно по всем верёвкам (15 на 6 → 3,2,3,2,3,2), чтобы ни одна не пустовала.
    // На каждой верёвке — не больше, чем помещается без нахлёста.
    slots = [];
    // Шаг между прищепками len/(n+1) не меньше ширины открытки с небольшим зазором.
    const capacity = ropes.map(r => Math.max(1, Math.floor(Math.hypot(r.x1 - r.x0, r.y1 - r.y0) / (card * 1.08)) - 1));
    const total = Math.min(keep, capacity.reduce((a, b) => a + b, 0));
    ropes.forEach((rope, ri) => {
      const even = Math.floor((ri + 1) * total / ropes.length) - Math.floor(ri * total / ropes.length);
      const count = Math.min(even, capacity[ri]);
      for (let k = 0; k < count; k++) slots.push({ rope: ri, t: (k + 1) / (count + 1), tilt: (rnd() - .5) * .4 });
    });
  }
  const ropePoint = (r, t) => ({ x: r.x0 + (r.x1 - r.x0) * t, y: r.y0 + (r.y1 - r.y0) * t + Math.sin(Math.PI * t) * r.sag });
  function draw(p) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Верёвки прорисовываются и зажигаются огоньки.
    const rope = smooth(clamp((p - .04) / .26));
    ropes.forEach((r, ri) => {
      ctx.strokeStyle = '#3a1a1f'; ctx.lineWidth = 2.5; ctx.beginPath();
      const steps = 30; for (let i = 0; i <= steps * rope; i++) { const q = ropePoint(r, i / steps); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); } ctx.stroke();
      for (let i = 1; i < 9; i++) { const t = i / 9; if (t > rope) break; const q = ropePoint(r, t), c = ['#ef3124', '#fa7ab3', '#1ac3fd', '#f8e4c2'][(i + ri) % 4];
        ctx.fillStyle = c + '44'; ctx.beginPath(); ctx.arc(q.x, q.y + 7, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(q.x, q.y + 7, 4, 6, 0, 0, Math.PI * 2); ctx.fill(); }
    });
    // Полученные: вылетают из конверта, качаются и повисают на прищепках.
    slots.forEach((s, i) => {
      const t0 = .5 + (i / Math.max(1, slots.length)) * .24, t = clamp((p - t0) / .08); if (t <= 0) return;
      const pin = ropePoint(ropes[s.rope], s.t), e = 1 - (1 - t) ** 3;
      const x = source.x + (pin.x - source.x) * e, y = source.y + (pin.y - source.y) * e - Math.sin(Math.PI * e) * H * .12;
      const swing = s.tilt + (1 - t) * 2.4 * (i % 2 ? 1 : -1) + Math.sin(t * 9) * (1 - t) * .3;
      ctx.save(); ctx.translate(x, y); ctx.rotate(swing);
      const w = card * (.55 + .45 * e), h = w * 170 / 240;
      ctx.drawImage(cards[i % cards.length], -w / 2, 0, w, h);
      if (t >= 1) { ctx.fillStyle = '#c98a5a'; ctx.fillRect(-w * .05, -w * .08, w * .1, w * .2); }    // прищепка
      ctx.restore();
    });
    // Отправленные — со штемпелем, улетают из конверта за край экрана.
    flyers.forEach((f, i) => {
      const t0 = .77 + (i / Math.max(1, flyers.length)) * .12, t = clamp((p - t0) / .1); if (t <= 0 || t >= 1) return;
      const d = Math.hypot(W, H) * .75 * smooth(t), x = source.x + Math.cos(f.a) * d, y = source.y + Math.sin(f.a) * d;
      ctx.save(); ctx.translate(x, y); ctx.rotate(f.spin * t * 3); ctx.globalAlpha = Math.min(1, t * 6);
      const w = card * f.s; ctx.drawImage(stamped[i % stamped.length], -w / 2, -w * .35, w, w * 170 / 240); ctx.restore();
    });
    ctx.globalAlpha = 1;
  }
  return { resize, draw, release() { canvas.width = canvas.height = 1; } };
}
