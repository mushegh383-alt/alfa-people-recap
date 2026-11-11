// Две сцены после к-толка: «Созвездие» (знак зодиака самых частых собеседников)
// и «Стена глаз» (сколько раз смотрели профиль). Обе — липкая сцена на скролле,
// как остальные слайды. Всё рисуется кодом: созвездие — SVG с прорисовкой линий,
// небо и глаза — по одному canvas (один слой GPU вместо десятков элементов).
import { requestRenderFrame as requestAnimationFrame, cancelRenderFrame as cancelAnimationFrame, canvasBudget, getQuality } from './performance.js';
import { ease, sectionProgress, reel } from './november-layout.js';
import { fitScale } from './layout-fit.js';
import { setHeadingScale } from './typography.js';
import { endingSceneProgress } from './ending-chapter-layout.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const DESIGN = { width: 1920, height: 1600 };

// [именительный, творительный мн. ч., именительный мн. ч.]
export const ZODIAC_NAMES = {
  aries: ['Овен', 'Овнами', 'Овны'], taurus: ['Телец', 'Тельцами', 'Тельцы'], gemini: ['Близнецы', 'Близнецами', 'Близнецы'],
  cancer: ['Рак', 'Раками', 'Раки'], leo: ['Лев', 'Львами', 'Львы'], virgo: ['Дева', 'Девами', 'Девы'],
  libra: ['Весы', 'Весами', 'Весы'], scorpio: ['Скорпион', 'Скорпионами', 'Скорпионы'], sagittarius: ['Стрелец', 'Стрельцами', 'Стрельцы'],
  capricorn: ['Козерог', 'Козерогами', 'Козероги'], aquarius: ['Водолей', 'Водолеями', 'Водолеи'], pisces: ['Рыбы', 'Рыбами', 'Рыбы'],
};

// Стилизованные созвездия: звёзды в долях рамки (0..1) и линии между ними.
// Первая звезда — самая яркая (Регул, Спика, Антарес…).
export const CONSTELLATIONS = {
  aries: { stars: [[.86, .52], [.62, .36], [.42, .38], [.12, .58]], lines: [[0, 1], [1, 2], [2, 3]] },
  taurus: { stars: [[.38, .62], [.5, .55], [.18, .8], [.42, .46], [.22, .2], [.66, .48], [.84, .34]], lines: [[1, 0], [0, 2], [1, 3], [3, 4], [1, 5], [5, 6]] },
  gemini: { stars: [[.52, .14], [.32, .12], [.3, .38], [.26, .62], [.18, .88], [.55, .42], [.6, .66], [.68, .9], [.12, .45], [.74, .4]], lines: [[1, 0], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [2, 5], [2, 8], [5, 9]] },
  cancer: { stars: [[.5, .48], [.46, .12], [.2, .84], [.56, .62], [.82, .82]], lines: [[0, 1], [0, 2], [0, 3], [3, 4]] },
  leo: { stars: [[.28, .74], [.3, .55], [.36, .4], [.3, .26], [.2, .17], [.12, .3], [.66, .4], [.9, .56], [.66, .62]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [2, 6], [6, 7], [7, 8], [8, 0], [6, 8]] },
  virgo: { stars: [[.42, .84], [.45, .58], [.3, .48], [.14, .4], [.58, .46], [.7, .3], [.86, .2], [.62, .68], [.82, .8]], lines: [[0, 1], [1, 2], [2, 3], [1, 4], [4, 5], [5, 6], [1, 7], [7, 8]] },
  libra: { stars: [[.5, .14], [.24, .46], [.76, .42], [.3, .8], [.72, .82]], lines: [[0, 1], [0, 2], [1, 2], [1, 3], [2, 4]] },
  scorpio: { stars: [[.32, .38], [.18, .3], [.12, .16], [.14, .46], [.42, .46], [.48, .6], [.5, .76], [.6, .86], [.74, .88], [.84, .78], [.8, .64]], lines: [[2, 1], [3, 1], [1, 0], [0, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10]] },
  sagittarius: { stars: [[.6, .45], [.3, .5], [.45, .42], [.62, .64], [.45, .7], [.3, .66], [.52, .22], [.84, .54], [.12, .58]], lines: [[1, 2], [2, 0], [0, 3], [3, 4], [4, 5], [5, 1], [2, 6], [6, 0], [0, 7], [7, 3], [1, 8], [8, 5]] },
  capricorn: { stars: [[.88, .38], [.12, .28], [.3, .42], [.55, .74], [.72, .72], [.76, .44], [.46, .5]], lines: [[1, 2], [2, 3], [3, 4], [4, 0], [0, 5], [5, 6], [6, 2]] },
  aquarius: { stars: [[.48, .22], [.14, .26], [.32, .33], [.62, .38], [.55, .55], [.68, .7], [.84, .6], [.42, .72], [.28, .88]], lines: [[1, 2], [2, 0], [0, 3], [3, 4], [4, 5], [5, 6], [4, 7], [7, 8]] },
  pisces: { stars: [[.14, .76], [.4, .56], [.62, .38], [.74, .18], [.9, .26], [.84, .42], [.42, .82], [.66, .86], [.82, .76], [.94, .86], [.84, .95]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 2], [0, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 7]] },
};

// Детерминированный «случай», чтобы раскладка не прыгала между перезагрузками.
function random(seed) { let s = seed >>> 0; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909), (s >>>= 0) / 4294967296)); }
const SPARKLE = 'M0 -1 L.22 -.22 L1 0 L.22 .22 L0 1 L-.22 .22 L-1 0 L-.22 -.22 Z';
function node(tag, attrs = {}, text) { const el = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); if (text !== undefined) el.textContent = text; return el; }
function scene(id, label, cls = id) {
  const section = node('section', { id, class: `sky-scene ${cls}`, 'aria-label': label });
  section.innerHTML = '<div class="november-stage sky-stage"><canvas class="sky-canvas" aria-hidden="true"></canvas><div class="november-composition sky-composition"></div></div>';
  return section;
}
function place(el, x, y, w) { Object.assign(el.style, { left: `${x}px`, top: `${y}px`, width: `${w}px` }); return el; }

// ───────────────────────────── «Созвездие» ─────────────────────────────
const BOX = { x: 240, y: 160, w: 1440, h: 800 };
export function createZodiac(data) {
  const z = data.zodiac, names = ZODIAC_NAMES[z.sign], shape = CONSTELLATIONS[z.sign];
  const section = scene('zodiac', 'Знак зодиака ваших собеседников');
  section.dataset.sign = z.sign;
  const c = section.querySelector('.sky-composition');
  c.append(place(node('p', { class: 'sky-kicker' }, z.kicker), 0, 120, 1920));
  // Созвездие: у каждой линии мягкий ореол и яркая сердцевина, без фильтров.
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'zodiac-art'); svg.setAttribute('viewBox', `0 0 ${BOX.w} ${BOX.h}`); svg.setAttribute('aria-hidden', 'true');
  Object.assign(svg.style, { left: `${BOX.x}px`, top: `${BOX.y}px`, width: `${BOX.w}px`, height: `${BOX.h}px` });
  const pad = 70, pt = ([x, y]) => [pad + x * (BOX.w - pad * 2), pad + y * (BOX.h - pad * 2)];
  const ns = 'http://www.w3.org/2000/svg', make = (tag, attrs) => { const el = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); return el; };
  const defs = make('defs', {});
  defs.innerHTML = '<radialGradient id="zodiac-halo"><stop offset="0" stop-color="#fa7ab3" stop-opacity=".75"/><stop offset=".45" stop-color="#fa7ab3" stop-opacity=".22"/><stop offset="1" stop-color="#fa7ab3" stop-opacity="0"/></radialGradient>';
  svg.append(defs);
  const lines = make('g', { class: 'zodiac-lines' }), stars = make('g', { class: 'zodiac-stars' });
  shape.lines.forEach(([a, b]) => {
    const [x1, y1] = pt(shape.stars[a]), [x2, y2] = pt(shape.stars[b]), d = `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`;
    const g = make('g', { class: 'zodiac-line' });
    g.append(make('path', { d, class: 'zodiac-line-glow', pathLength: '1' }), make('path', { d, class: 'zodiac-line-core', pathLength: '1' }));
    lines.append(g);
  });
  shape.stars.forEach((s, i) => {
    const [x, y] = pt(s), r = i === 0 ? 30 : 15 + (i * 7) % 9;
    const g = make('g', { class: `zodiac-star${i === 0 ? ' is-bright' : ''}`, transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})` });
    const inner = make('g', { class: 'zodiac-star-pop' });
    inner.append(make('circle', { r: String(r * 3.2), fill: 'url(#zodiac-halo)' }), make('path', { d: SPARKLE, transform: `scale(${r})`, class: 'zodiac-sparkle' }));
    g.append(inner); stars.append(g);
  });
  svg.append(lines, stars); c.append(svg);
  const heading = place(node('h2', { class: 'november-heading sky-heading zodiac-heading' }, names[0]), 0, 630, 1920);
  c.append(heading, node('i', { class: 'zodiac-comet', 'aria-hidden': 'true' }));
  if (z.share != null) {
    const number = place(node('p', { class: 'sky-number zodiac-number', 'aria-hidden': 'true' }, `${z.share}%`), 0, 960, 1920);
    number.dataset.value = String(z.share); c.append(number);
  }
  const label = z.label || (z.share != null ? `ваших собеседников — ${names[2]}` : `${names[2]} — ваши самые\nчастые собеседники`);
  c.append(place(node('p', { class: 'sky-label zodiac-label' }, label), 0, z.share != null ? 1290 : 1040, 1920));
  // 2-е и 3-е место — строкой ниже и мельче первого.
  const runners = (z.others || []).filter(o => ZODIAC_NAMES[o.sign]);
  if (runners.length) {
    const row = place(node('div', { class: 'zodiac-runners' }), 0, z.share != null ? 1375 : 1125, 1920);
    runners.forEach((o, i) => {
      const item = node('div', { class: 'zodiac-runner' });
      item.append(node('span', { class: 'zodiac-runner-place' }, String(i + 2)), node('span', { class: 'zodiac-runner-name' }, ZODIAC_NAMES[o.sign][0]));
      if (o.share != null) item.append(node('span', { class: 'zodiac-runner-share' }, `${o.share}%`));
      row.append(item);
    });
    c.append(row);
  }
  c.append(place(node('p', { class: 'sky-note zodiac-note' }, z.note), 0, (z.share != null ? 1290 : 1040) + (runners.length ? 225 : 90), 1920));
  c.append(node('span', { class: 'sr-only' }, `${z.kicker} ${names[0]}.${z.share != null ? ` ${z.share}% ваших собеседников — ${names[2]}.` : ''}`));
  return section;
}

// ───────────────────────────── «Стена глаз» ─────────────────────────────
export function createProfileViews(data) {
  const v = data.profileViews, section = scene('profile-views', 'Просмотры профиля');
  const c = section.querySelector('.sky-composition');
  const text = v.count.toLocaleString('ru-RU');
  c.append(place(node('h2', { class: 'november-heading sky-heading eyes-heading' }, v.heading), 0, 150, 1920));
  const number = place(node('p', { class: 'sky-number eyes-number', 'aria-hidden': 'true' }, text), 0, 470, 1920);
  number.dataset.value = String(v.count); number.style.fontSize = `${Math.min(560, 2300 / Math.max(1, text.length))}px`;
  c.append(number, place(node('p', { class: 'sky-label eyes-label' }, v.label), 0, 1090, 1920), place(node('p', { class: 'sky-note eyes-note' }, v.note), 0, 1250, 1920));
  c.append(node('span', { class: 'sr-only' }, `${v.count} — ${v.label.replaceAll('\n', ' ')}`));
  return section;
}

// ───────────────────────────── движение ─────────────────────────────
export function mountSkyScenes(root, signal) {
  root.querySelectorAll('.sky-scene').forEach(section => (section.id === 'office' ? mountTower : mountScene)(section, signal));
}

function mountScene(section, signal) {
  const eyesMode = section.id === 'profile-views';
  const stage = section.querySelector('.sky-stage'), composition = section.querySelector('.sky-composition');
  const canvas = section.querySelector('.sky-canvas'), ctx = canvas.getContext('2d');
  const q = sel => section.querySelector(sel);
  const heading = q('.sky-heading'), number = q('.sky-number'), label = q('.sky-label'), note = q('.sky-note'), kicker = q('.sky-kicker');
  const lines = [...section.querySelectorAll('.zodiac-line')], stars = [...section.querySelectorAll('.zodiac-star-pop')], art = q('.zodiac-art'), comet = q('.zodiac-comet');
  let active = false, raf = 0, p, last = 0, width = 1, height = 1, dpr = 1, scale = 1;
  let eyes = [], pointer = null, centre = { x: 0, y: 0 }, lastDraw = 0;

  // Звезда появляется, когда до неё дотягивается первая линия.
  const lineWindow = i => { const span = .42 / Math.max(1, lines.length); return [.14 + i * span, .14 + i * span + span * 1.7]; };
  const starTime = [];
  if (!eyesMode) {
    const shape = CONSTELLATIONS[section.dataset.sign];
    shape?.lines.forEach(([a, b], i) => { const [s] = lineWindow(i); for (const n of [a, b]) starTime[n] = Math.min(starTime[n] ?? 1, n === a ? s : s + .42 / lines.length); });
  }

  function fit() {
    width = stage.clientWidth; height = stage.clientHeight;
    scale = fitScale(width, height, DESIGN.width, DESIGN.height, section.id);
    composition.style.transform = `translate(-50%,-50%) scale(${scale})`;
    setHeadingScale(composition, scale, width, height);
    if (!eyesMode) fitSignName();
    dpr = canvasBudget(width, height).ratio;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    if (eyesMode) layoutEyes(); else paintSky();
    schedule();
  }

  // Название знака крупное, но длинные («Близнецы», «Скорпион», «Водолей») не
  // должны вылезать за экран: шрифт уменьшается, пока слово не встанет с полями.
  function fitSignName() {
    const sign = section.querySelector('.zodiac-heading'); if (!sign) return;
    if (width / Math.max(1, height) < .8) return;            // телефон: ширину подгоняет typography.js
    sign.style.removeProperty('font-size');                   // сбросить прошлую подгонку перед замером
    const range = document.createRange(); range.selectNodeContents(sign);
    const textW = range.getBoundingClientRect().width / Math.max(.01, scale);          // ширина слова в px макета
    const avail = Math.min(DESIGN.width, width / Math.max(.01, scale)) - 2 * 48 / Math.max(.01, scale);
    if (textW > avail) {
      const size = parseFloat(getComputedStyle(sign).fontSize) * avail / textW;
      sign.style.setProperty('font-size', `${size.toFixed(1)}px`, 'important');
    }
  }

  // Небо рисуется один раз на размер экрана: звёзды и розовая туманность.
  function paintSky() {
    const rnd = random(20261110), count = Math.round(Math.min(260, width * height / 5200) * (getQuality() === 'lite' ? .7 : 1));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
    const nebula = ctx.createRadialGradient(width * .5, height * .45, 0, width * .5, height * .45, Math.max(width, height) * .6);
    nebula.addColorStop(0, 'rgba(250,122,179,.16)'); nebula.addColorStop(.45, 'rgba(239,49,36,.07)'); nebula.addColorStop(1, 'rgba(2,1,1,0)');
    ctx.fillStyle = nebula; ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < count; i++) {
      const x = rnd() * width, y = rnd() * height, r = rnd() ** 3 * 2.2 + .4, tint = rnd();
      ctx.globalAlpha = .25 + rnd() * .65;
      ctx.fillStyle = tint > .9 ? '#fa7ab3' : tint > .82 ? '#1ac3fd' : '#f8e4c2';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Глаза раскладываются по свободному месту вокруг текста (на любом экране).
  function layoutEyes() {
    const portrait = width / Math.max(1, height) < .8, rnd = random(1248);
    const r = Math.max(16, Math.min(58, Math.min(width, height) * (portrait ? .072 : .052)));
    const shownText = number.textContent; number.textContent = Number(number.dataset.value).toLocaleString('ru-RU');
    const stageBox = stage.getBoundingClientRect(), pad = r * .9;
    const blocked = [heading, number, label, note].filter(Boolean).map(el => { const b = el.getBoundingClientRect(); return { l: b.left - stageBox.left - pad, t: b.top - stageBox.top - pad, r: b.right - stageBox.left + pad, b: b.bottom - stageBox.top + pad }; });
    // Текст в ширину блока, а не во весь контейнер: сужаем рамки до реального слова.
    for (const [i, el] of [heading, number, label, note].filter(Boolean).entries()) {
      const range = document.createRange(); range.selectNodeContents(el); const t = range.getBoundingClientRect();
      if (t.width) Object.assign(blocked[i], { l: t.left - stageBox.left - pad, r: t.right - stageBox.left + pad });
    }
    const nb = number.getBoundingClientRect();
    centre = { x: (nb.left + nb.right) / 2 - stageBox.left, y: (nb.top + nb.bottom) / 2 - stageBox.top };
    number.textContent = shownText;
    const target = Math.round(portrait ? 24 : Math.min(40, width * height / 26000)), list = [];
    for (let tries = 0; list.length < target && tries < 4000; tries++) {
      const size = r * (.7 + rnd() * .6), x = size * 1.2 + rnd() * (width - size * 2.4), y = size + rnd() * (height - size * 2);
      if (blocked.some(b => x + size > b.l && x - size < b.r && y + size * .6 > b.t && y - size * .6 < b.b)) continue;
      if (list.some(e => Math.hypot(e.x - x, (e.y - y) * 1.6) < (e.r + size) * 1.15)) continue;
      list.push({ x, y, r: size, iris: ['#1ac3fd', '#fa7ab3', '#ef3124', '#1ac3fd', '#fa7ab3'][list.length % 5], wander: rnd() * Math.PI * 2, blink: 0, seed: rnd() });
    }
    // Открываются от центра к краям — как будто волна взглядов.
    const cx = width / 2, cy = height / 2;
    list.sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy)).forEach((e, i, all) => { e.openAt = .06 + (i / all.length) * .44 + e.seed * .04; });
    eyes = list;
  }

  function drawEye(e, open, gaze) {
    const w = e.r, h = e.r * .62 * open, line = Math.max(1.4, e.r * .1);
    ctx.save(); ctx.translate(e.x, e.y);
    if (open < .08) {
      // Закрытый глаз: дуга с ресничками.
      ctx.strokeStyle = '#f8e4c2'; ctx.lineWidth = line; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-w, 0); ctx.quadraticCurveTo(0, e.r * .45, w, 0); ctx.stroke();
      for (const t of [-.55, 0, .55]) { ctx.beginPath(); ctx.moveTo(t * w, e.r * .22 - Math.abs(t) * e.r * .1); ctx.lineTo(t * w * 1.15, e.r * .5); ctx.stroke(); }
      ctx.restore(); return;
    }
    ctx.beginPath(); ctx.moveTo(-w, 0); ctx.quadraticCurveTo(0, -h * 1.9, w, 0); ctx.quadraticCurveTo(0, h * 1.9, -w, 0); ctx.closePath();
    ctx.fillStyle = '#f8e4c2'; ctx.fill();
    ctx.save(); ctx.clip();
    const ix = gaze.x * e.r * .42, iy = gaze.y * e.r * .3;
    ctx.fillStyle = e.iris; ctx.beginPath(); ctx.arc(ix, iy, e.r * .44, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#020101'; ctx.beginPath(); ctx.arc(ix, iy, e.r * .2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(ix - e.r * .12, iy - e.r * .13, e.r * .08, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#020101'; ctx.lineWidth = line; ctx.stroke();
    ctx.restore();
  }

  function drawEyes(now) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
    const focus = reduced.matches ? 1 : ease(.52, .66, p);
    const target = pointer && focus > .99 ? pointer : centre;
    let idle = false;
    for (const e of eyes) {
      const t = Math.max(0, Math.min(1, (p - e.openAt) / .07));
      let open = reduced.matches ? 1 : t < 1 ? 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2 : 1;   // backOut
      if (open > .5 && !reduced.matches) {
        // Моргание: раз в 2–7 секунд, у каждого глаза свой ритм.
        if (!e.blink) e.blink = now + 600 + e.seed * 4000;
        else if (now > e.blink + 160) e.blink = now + 2000 + Math.random() * 5000;
        const b = now - e.blink; if (b > 0 && b < 160) open *= Math.abs(b - 80) / 80;
        idle = true;
      }
      const wander = { x: Math.cos(e.wander + now / 1700 * (.6 + e.seed)), y: Math.sin(e.wander * 1.3 + now / 2100) * .8 };
      const dx = target.x - e.x, dy = target.y - e.y, d = Math.max(1, Math.hypot(dx, dy));
      const at = { x: dx / d * Math.min(1, d / (e.r * 4)), y: dy / d * Math.min(1, d / (e.r * 4)) };
      drawEye(e, Math.max(0, open), { x: wander.x * (1 - focus) + at.x * focus, y: wander.y * (1 - focus) + at.y * focus });
    }
    return idle;
  }

  function update(now) {
    raf = 0; if (!active || document.hidden || signal.aborted) return;
    const b = section.getBoundingClientRect(), target = reduced.matches ? 1 : sectionProgress(b.top, b.height, innerHeight), dt = last ? Math.min(64, now - last) : 16; last = now;
    p = p === undefined || reduced.matches ? target : p + (target - p) * (1 - Math.exp(-dt / 75));
    if (Math.abs(target - p) < .0002) p = target;
    section.dataset.progress = p.toFixed(4);
    let keepGoing = Math.abs(target - p) > .0002;
    if (eyesMode) {
      heading.style.opacity = ease(0, .14, p); heading.style.transform = `translateY(${(1 - ease(0, .14, p)) * 40}px)`;
      const count = ease(.08, .58, p), pop = Math.sin(Math.PI * ease(.56, .7, p));
      number.style.opacity = ease(.06, .2, p);
      number.style.transform = `scale(${.9 + .1 * ease(.06, .3, p) + pop * .07})`;
      const value = Number(number.dataset.value), shown = count >= 1 ? value : Math.round(value * count);
      number.textContent = shown.toLocaleString('ru-RU');
      label.style.opacity = ease(.6, .74, p); label.style.transform = `translateY(${(1 - ease(.6, .74, p)) * 30}px)`;
      note.style.opacity = ease(.7, .84, p);
      // Моргание и взгляд живые, пока сцена на экране; на телефоне — 30 кадров/с.
      const frameGap = getQuality() === 'lite' ? 32 : 0;
      if (keepGoing || now - lastDraw >= frameGap) { lastDraw = now; if (drawEyes(now)) keepGoing = true; } else keepGoing = true;
    } else {
      canvas.style.opacity = ease(0, .12, p);
      kicker.style.opacity = ease(.04, .16, p);
      const spin = ease(.08, .62, p);
      art.style.transform = `rotate(${(1 - spin) * -8}deg) scale(${.88 + .12 * spin})`;
      art.style.opacity = 1 - .45 * ease(.6, .72, p);
      lines.forEach((g, i) => { const [a, z] = lineWindow(i), t = ease(a, z, p); g.style.setProperty('--draw', (1 - t).toFixed(4)); g.style.opacity = t > 0 ? 1 : 0; });
      stars.forEach((s, i) => { const t = ease(starTime[i] ?? .14, (starTime[i] ?? .14) + .06, p); s.style.transform = `scale(${t < 1 ? t * (1.35 - .35 * t) : 1})`; s.style.opacity = t; });
      const word = ease(.58, .72, p);
      heading.style.opacity = word; heading.style.transform = `translateY(-50%) translateY(${(1 - word) * 60}px) scale(${.85 + .15 * word})`;
      const fly = ease(.6, .78, p); comet.style.opacity = Math.sin(Math.PI * fly); comet.style.transform = `translate(${-500 + fly * 1500}px, ${fly * 380}px) rotate(24deg)`;
      if (number) { const n = ease(.66, .8, p); number.style.opacity = n; number.style.transform = `translateY(${(1 - n) * 50}px)`; number.textContent = reduced.matches ? `${number.dataset.value}%` : `${reel(number.dataset.value, ease(.66, .86, p))}%`; }
      label.style.opacity = ease(.74, .86, p); note.style.opacity = ease(.84, .95, p);
      const runners = section.querySelector('.zodiac-runners'); if (runners) { const r = ease(.78, .9, p); runners.style.opacity = r; runners.style.transform = `translateY(${(1 - r) * 40}px)`; }
    }
    if (keepGoing) schedule();
  }
  function schedule() { if (!raf && active && !signal.aborted && !document.hidden) raf = requestAnimationFrame(update); }

  const observer = new IntersectionObserver(([e]) => {
    active = e.isIntersecting; section.classList.toggle('is-on-screen', active);
    if (active) schedule(); else { cancelAnimationFrame(raf); raf = 0; last = 0; }
  }, { rootMargin: '150px' });
  observer.observe(section);
  const resize = new ResizeObserver(fit); resize.observe(stage);
  document.fonts?.ready.then(() => { if (!signal.aborted) fit(); });
  fit();
  if (eyesMode) {
    stage.addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; const b = stage.getBoundingClientRect(); pointer = { x: e.clientX - b.left, y: e.clientY - b.top }; schedule(); }, { passive: true, signal });
    stage.addEventListener('pointerleave', () => { pointer = null; schedule(); }, { signal });
  }
  window.addEventListener('scroll', schedule, { passive: true, signal });
  document.addEventListener('visibilitychange', () => { last = 0; schedule(); }, { signal });
  reduced.addEventListener('change', schedule, { signal });
  signal.addEventListener('abort', () => { observer.disconnect(); resize.disconnect(); cancelAnimationFrame(raf); canvas.width = canvas.height = 1; }, { once: true });
}

// ───────────────────────────── «Офис-высотка» ─────────────────────────────
// Каждое окно — рабочий день года (13 окон в ряд, снизу вверх: январь → декабрь).
// По скроллу окна загораются по порядку; светится ровно столько, сколько дней
// человек был в офисе. В конце на крыше включается неоновая вывеска.
const TOWER = { x: 560, y: 640, w: 800, h: 590, cols: 13, workdays: 260 };
export function createOfficeTower(data) {
  const o = data.office, section = scene('office', 'Походы в офис', 'office-tower');
  const c = section.querySelector('.sky-composition');
  const sign = node('h2', { class: 'november-heading sky-heading tower-sign', 'aria-hidden': 'true' }, 'офис');
  place(sign, 0, 40, 1920);                            // заголовок блока сверху; на крыше — логотип (на холсте)
  c.append(sign);
  const number = place(node('p', { class: 'sky-number tower-number', 'aria-hidden': 'true' }, '0'), 0, 1236, 1920);
  number.dataset.value = String(o.visits);
  c.append(number, place(node('p', { class: 'sky-label tower-label' }, o.label), 0, 1522, 1920));
  c.append(node('span', { class: 'sr-only' }, `${o.label}: ${o.visits}`));
  return section;
}

function mountTower(section, signal) {
  const stage = section.querySelector('.sky-stage'), composition = section.querySelector('.sky-composition');
  const canvas = section.querySelector('.sky-canvas'), ctx = canvas.getContext('2d');
  const sign = section.querySelector('.tower-sign'), number = section.querySelector('.tower-number'), label = section.querySelector('.tower-label');
  const visits = Number(number.dataset.value);
  const cells = Math.max(TOWER.workdays, Math.ceil(visits / TOWER.cols) * TOWER.cols), rows = cells / TOWER.cols;
  // Какие дни — «офисные»: по ряду (месяцу) равномерно, детерминированно.
  const rnd = random(134 + visits), order = Array.from({ length: cells }, (_, i) => i);
  const lit = new Set([...order].sort(() => rnd() - .5).slice(0, Math.min(visits, cells)));
  const litOrder = order.filter(i => lit.has(i));                     // хронологически: снизу вверх
  const kind = new Map(litOrder.map(i => [i, rnd() < .14 ? 'screen' : rnd() < .12 ? 'person' : 'lamp']));
  let active = false, raf = 0, p, last = 0, width = 1, height = 1, dpr = 1, scale = 1, sky = null, drawn = -1;
  // Красный логотип-вывеска на крыше.
  const logo = new Image(); logo.onload = () => { drawn = -1; schedule(); }; logo.src = './assets/brand/alfa-logo.svg';

  function fit() {
    width = stage.clientWidth; height = stage.clientHeight;
    scale = fitScale(width, height, DESIGN.width, DESIGN.height, 'office');
    composition.style.transform = `translate(-50%,-50%) scale(${scale})`;
    setHeadingScale(composition, scale, width, height);
    dpr = canvasBudget(width, height).ratio;
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    // Небо рисуем один раз на размер экрана в отдельный холст.
    sky = document.createElement('canvas'); sky.width = canvas.width; sky.height = canvas.height;
    const s = sky.getContext('2d'), r = random(20261231), count = Math.round(Math.min(220, width * height / 6000) * (getQuality() === 'lite' ? .7 : 1));
    s.setTransform(dpr, 0, 0, dpr, 0, 0);
    const glow = s.createRadialGradient(width / 2, height * .92, 0, width / 2, height * .92, Math.max(width, height) * .7);
    glow.addColorStop(0, 'rgba(239,49,36,.22)'); glow.addColorStop(.5, 'rgba(250,122,179,.06)'); glow.addColorStop(1, 'rgba(2,1,1,0)');
    s.fillStyle = glow; s.fillRect(0, 0, width, height);
    for (let i = 0; i < count; i++) { s.globalAlpha = .2 + r() * .6; s.fillStyle = r() > .88 ? '#fa7ab3' : '#f8e4c2'; s.beginPath(); s.arc(r() * width, r() * height * .8, r() ** 3 * 2 + .4, 0, Math.PI * 2); s.fill(); }
    s.globalAlpha = 1;
    // Ночной город вокруг: тёмные высотки с редкими огнями (декорация, не данные).
    const ground = Y(TOWER.y + TOWER.h), towerL = X(TOWER.x) - 24 * scale, towerR = X(TOWER.x + TOWER.w) + 24 * scale;
    for (const side of [-1, 1]) {
      let edge = side < 0 ? towerL : towerR;
      while (side < 0 ? edge > -40 : edge < width + 40) {
        const bw = (120 + r() * 200) * scale, bh = (220 + r() * 480) * scale, bx = side < 0 ? edge - bw : edge;
        s.fillStyle = r() > .5 ? '#12040a' : '#1a060c'; s.fillRect(bx, ground - bh, bw, bh);
        const cw = 34 * scale, chh = 40 * scale;
        for (let wy = ground - bh + 22 * scale; wy < ground - 30 * scale; wy += chh) for (let wx = bx + 14 * scale; wx < bx + bw - 22 * scale; wx += cw) {
          if (r() > .16) continue; s.fillStyle = r() > .8 ? 'rgba(26,195,253,.45)' : 'rgba(248,228,194,.38)'; s.fillRect(wx, wy, 16 * scale, 20 * scale);
        }
        edge += side * (bw + (8 + r() * 30) * scale);
      }
    }
    s.fillStyle = '#0a0205'; s.fillRect(0, ground, width, height - ground);
    drawn = -1; schedule();
  }
  const X = x => width / 2 + (x - DESIGN.width / 2) * scale, Y = y => height / 2 + (y - DESIGN.height / 2) * scale;

  function draw(p) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = ease(0, .1, p); ctx.drawImage(sky, 0, 0); ctx.globalAlpha = 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const rise = reduced.matches ? 0 : (1 - ease(0, .2, p)) * 240;          // здание поднимается из темноты
    const left = X(TOWER.x), top = Y(TOWER.y + rise), w = TOWER.w * scale, h = TOWER.h * scale, ground = Y(TOWER.y + TOWER.h);
    // Земля и отражение света.
    const pool = ctx.createRadialGradient(width / 2, ground, 0, width / 2, ground, w * 1.3);
    pool.addColorStop(0, `rgba(250,122,179,${.28 * ease(.2, .66, p)})`); pool.addColorStop(1, 'rgba(250,122,179,0)');
    ctx.fillStyle = pool; ctx.fillRect(0, ground - w * .2, width, w * 1.4);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, width, ground); ctx.clip();
    // Корпус: тёмный фасад, красная кромка, ступенька-крыша.
    const facade = ctx.createLinearGradient(0, top, 0, top + h);
    facade.addColorStop(0, '#2b0b11'); facade.addColorStop(1, '#14050a');
    ctx.fillStyle = facade; ctx.fillRect(left, top, w, h);
    ctx.fillStyle = '#3a0f17'; ctx.fillRect(left + w * .08, top - 18 * scale, w * .84, 18 * scale);
    ctx.fillRect(left + w * .38, top - 60 * scale, w * .24, 42 * scale);
    ctx.strokeStyle = '#ef3124'; ctx.lineWidth = Math.max(1, 3 * scale); ctx.strokeRect(left, top, w, h);
    // Красные пилоны по краям фасада.
    ctx.fillStyle = '#ef3124'; ctx.fillRect(left - 14 * scale, top - 18 * scale, 14 * scale, h + 18 * scale); ctx.fillRect(left + w, top - 18 * scale, 14 * scale, h + 18 * scale);
    // Окна.
    const padX = 30 * scale, padY = 32 * scale, cw = (w - padX * 2) / TOWER.cols, ch = (h - padY * 2) / rows;
    const ww = cw * .66, wh = ch * .64, on = ease(.18, .66, p) * litOrder.length;
    const litNow = new Map(litOrder.map((cell, k) => [cell, Math.max(0, Math.min(1, on - k))]));
    for (let i = 0; i < cells; i++) {
      const row = Math.floor(i / TOWER.cols), col = i % TOWER.cols;
      const x = left + padX + col * cw + (cw - ww) / 2, y = top + h - padY - (row + 1) * ch + (ch - wh) / 2;
      const t = litNow.get(i) || 0;
      if (t <= 0) { ctx.fillStyle = '#2c1017'; ctx.fillRect(x, y, ww, wh); continue; }
      const type = kind.get(i), flash = t < 1 ? 1 - t : 0;
      ctx.fillStyle = type === 'screen' ? 'rgba(26,195,253,.22)' : 'rgba(250,122,179,.22)';
      ctx.fillRect(x - ww * .22, y - wh * .3, ww * 1.44, wh * 1.6);              // мягкий ореол без фильтров
      ctx.fillStyle = type === 'screen' ? '#7fdcff' : '#f8e4c2';
      ctx.globalAlpha = .35 + .65 * t; ctx.fillRect(x, y, ww, wh); ctx.globalAlpha = 1;
      if (flash) { ctx.fillStyle = `rgba(255,255,255,${flash})`; ctx.fillRect(x, y, ww, wh); }
      if (type === 'person' && t >= 1) {                                       // силуэт за окном
        ctx.fillStyle = '#4a1520'; ctx.beginPath(); ctx.arc(x + ww * .5, y + wh * .42, ww * .16, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(x + ww * .3, y + wh * .62, ww * .4, wh * .38);
      }
    }
    // Линии этажей — каждый месяц (≈ 2 ряда окон).
    ctx.fillStyle = '#ef312433'; for (let r = 2; r < rows; r += 2) ctx.fillRect(left, top + h - padY - r * ch, w, Math.max(1, 2 * scale));
    ctx.restore();
    // Вход: светящиеся двери внизу по центру.
    const doorW = 120 * scale, doorH = 70 * scale, dx = left + w / 2 - doorW / 2, dy = ground - doorH;
    ctx.fillStyle = '#ef3124'; ctx.fillRect(dx - 10 * scale, dy - 10 * scale, doorW + 20 * scale, 10 * scale);
    const door = ctx.createLinearGradient(0, dy, 0, ground); door.addColorStop(0, '#f8e4c2'); door.addColorStop(1, '#fa7ab3');
    ctx.globalAlpha = .35 + .65 * ease(.1, .3, p); ctx.fillStyle = door; ctx.fillRect(dx, dy, doorW, doorH);
    ctx.fillStyle = '#2b0b11'; ctx.fillRect(dx + doorW / 2 - scale, dy, 2 * scale, doorH); ctx.globalAlpha = 1;
    // Логотип-вывеска на крыше: загорается с миганием, когда год «прожит».
    if (logo.complete && logo.naturalWidth) {
      const lw = w * .7, lh = lw * 82 / 408, lx = left + (w - lw) / 2, ly = top - 60 * scale - 26 * scale - lh;
      const n = ease(.64, .76, p), lit = n > 0 && n < 1 ? (Math.sin(n * 47) > .1 ? 1 : .3) : n;
      ctx.fillStyle = '#3a0f17'; ctx.fillRect(lx + lw * .2, ly + lh, 6 * scale, top - ly - lh); ctx.fillRect(lx + lw * .8 - 6 * scale, ly + lh, 6 * scale, top - ly - lh);
      if (lit > 0) {
        const halo = ctx.createRadialGradient(lx + lw / 2, ly + lh / 2, 0, lx + lw / 2, ly + lh / 2, lw * .7);
        halo.addColorStop(0, `rgba(250,122,179,${.35 * lit})`); halo.addColorStop(1, 'rgba(250,122,179,0)');
        ctx.fillStyle = halo; ctx.fillRect(lx - lw * .2, ly - lh * 1.5, lw * 1.4, lh * 4);
      }
      ctx.globalAlpha = .25 + .75 * lit; ctx.drawImage(logo, lx, ly, lw, lh); ctx.globalAlpha = 1;
    }
    // Ровно столько окон, сколько уже загорелось: счётчик совпадает с картинкой.
    return Math.round(on);
  }

  function update(now) {
    raf = 0; if (!active || document.hidden || signal.aborted) return;
    const target = endingSceneProgress(section, innerHeight, reduced.matches), dt = last ? Math.min(64, now - last) : 16; last = now;
    p = p === undefined || reduced.matches ? target : p + (target - p) * (1 - Math.exp(-dt / 75));
    if (Math.abs(target - p) < .0002) p = target;
    section.dataset.progress = p.toFixed(4);
    if (p !== drawn) {
      drawn = p;
      const count = draw(p);
      number.textContent = String(reduced.matches ? visits : Math.min(visits, count));
      number.style.opacity = ease(.14, .26, p); number.style.transform = `translateY(${(1 - ease(.14, .3, p)) * 60}px)`;
      const head = ease(.02, .16, p); sign.style.opacity = head; sign.style.transform = `translateY(${(1 - head) * 40}px)`;
      label.style.opacity = ease(.7, .84, p); label.style.transform = `translateY(${(1 - ease(.7, .84, p)) * 30}px)`;
    }
    if (Math.abs(target - p) > .0002) schedule();
  }
  function schedule() { if (!raf && active && !signal.aborted && !document.hidden) raf = requestAnimationFrame(update); }
  const observer = new IntersectionObserver(([e]) => {
    active = e.isIntersecting; section.classList.toggle('is-on-screen', active);
    if (active) schedule(); else { cancelAnimationFrame(raf); raf = 0; last = 0; }
  }, { rootMargin: '150px' });
  observer.observe(section);
  const resize = new ResizeObserver(fit); resize.observe(stage);
  document.fonts?.ready.then(() => { if (!signal.aborted) fit(); });
  fit();
  window.addEventListener('scroll', schedule, { passive: true, signal });
  document.addEventListener('visibilitychange', () => { last = 0; schedule(); }, { signal });
  reduced.addEventListener('change', schedule, { signal });
  signal.addEventListener('abort', () => { observer.disconnect(); resize.disconnect(); cancelAnimationFrame(raf); canvas.width = canvas.height = 1; if (sky) sky.width = sky.height = 1; }, { once: true });
}
