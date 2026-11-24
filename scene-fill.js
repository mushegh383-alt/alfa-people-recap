// Наполнение «пустых» экранов живой графикой из самих данных.
// Всё рисуется на canvas внутри композиции сцены, без фильтров; заготовки
// (записки, открытки) рендерятся один раз и дальше только двигаются.
import { canvasBudget, getQuality } from './performance.js';
import { screenRect } from './layout-fit.js';

const clamp = v => Math.max(0, Math.min(1, v));
const smooth = t => t * t * (3 - 2 * t);
const outBack = t => { const c = 1.6; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };
import { THANKS_WORDS } from './copy.js';
function random(seed) { let s = seed >>> 0; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909), (s >>>= 0) / 4294967296)); }
function sprite(w, h, paint) { const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h); return c; }
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

// ───────────────────────────── «Спасибки» ─────────────────────────────
// Полученные записки собираются вокруг сердца.
// Фразы на записках — из таблицы текстов (copy.js).
export function createThanksNotes(section) {
  const composition = section.querySelector('.thanks-composition');
  if (!composition) return null;
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
      W = host.clientWidth; H = host.clientHeight; S = scale;
      dpr = W/H < .8 ? Math.min(devicePixelRatio || 1, getQuality() === 'lite' ? 2 : 3, Math.sqrt(3500000 / Math.max(1,W*H))) : canvasBudget(W,H).ratio;
      canvas.width = Math.max(1, Math.round(W * dpr)); canvas.height = Math.max(1, Math.round(H * dpr));
      // Левый верхний угол экрана в координатах макета: (−(W/2 − 958·s)/s, −(H/2 − 739·s)/s).
      // CSS-размер — ровно экран (W×H) с обратным масштабом 1/S: в масштабированной сцене
      // холст размером в макет (W/S) iPhone держал в огромном слое — вылеты на «Спасибках».
      // Телефон: сцена масштабируется через zoom (performance.css) — там слой холста и так
      // размером с экран. На остальных — CSS-размер ровно экран с обратным масштабом 1/S.
      const zoomed = getQuality() === 'lite';
      Object.assign(canvas.style, { left: `${-(W / 2 - 958 * S) / S}px`, top: `${-(H / 2 - 739 * S) / S}px`, width: zoomed ? `${W / S}px` : `${W}px`, height: zoomed ? `${H / S}px` : `${H}px`, transform: zoomed ? 'none' : `scale(${1 / S})`, transformOrigin: '0 0' });
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
    // Длинные фразы: сначала чуть мельче, потом в две строки — текст не вылезает за записку.
    c.fillStyle = '#ef3124'; c.textAlign = 'center'; c.textBaseline = 'middle';
    let size = 34; c.font = `700 ${size}px Styrene, sans-serif`;
    while (size > 27 && c.measureText(word).width > 226) { size -= 1; c.font = `700 ${size}px Styrene, sans-serif`; }
    if (c.measureText(word).width <= 226) c.fillText(word, 0, 2);
    else {
      const parts = word.split(' '); let best = 1, diff = Infinity;
      for (let k = 1; k < parts.length; k++) { const d = Math.abs(c.measureText(parts.slice(0, k).join(' ')).width - c.measureText(parts.slice(k).join(' ')).width); if (d < diff) { diff = d; best = k; } }
      const lines = [parts.slice(0, best).join(' '), parts.slice(best).join(' ')];
      size = 30; c.font = `700 ${size}px Styrene, sans-serif`;
      while (size > 20 && Math.max(...lines.map(l => c.measureText(l).width)) > 226) { size -= 1; c.font = `700 ${size}px Styrene, sans-serif`; }
      c.fillText(lines[0], 0, 2 - size * .56); c.fillText(lines[1], 0, 2 + size * .56);
    }
    c.restore();
  }));
  const count = Math.min(received, cap);
  const incoming = Array.from({length:count}, (_,i) => {
    const order = i / Math.max(1,count-1);
    return {
      angle: -Math.PI/2 + .12 + order*(Math.PI*2-.24) + (rnd()-.5)*.1,
      spin: (rnd()-.5)*46, size: .5+rnd()*.3,
      t0: 2.52+order*.62+(rnd()-.5)*.05, card:cards[i%cards.length]
    };
  });
  let visibleHalf = 960, visibleHalfH = 740, placedFor = 0, sceneScale = 1, boost = 1;
  // Куда садятся полученные записки: по лучу от сердца наружу — первое место,
  // которое видно на экране, не задевает заголовок и цифры и не налезает на соседей.
  function place(scale) {
    // Рамки заголовка и цифр — в координатах макета через offset*: они не зависят ни от zoom
    // сцены на телефоне (экранные рамки там давали неверный масштаб, и записки садились на
    // заголовок), ни от въезда (transform) в момент расстановки.
    const local = el => {
      let x = 0, y = 0, e = el;
      while (e && e !== composition) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; }
      if (e !== composition) { const cb = screenRect(composition), r = screenRect(el); return { l: (r.left - cb.left) / scale, t: (r.top - cb.top) / scale, r: (r.right - cb.left) / scale, b: (r.bottom - cb.top) / scale }; }
      return { l: x, t: y, r: x + el.offsetWidth, b: y + el.offsetHeight };
    };
    const text = ['.thanks-title', '.thanks-stats'].map(sel => section.querySelector(sel)).filter(Boolean).map(local);
    const cx = 960, cy = 739, minX = cx - visibleHalf + 30, maxX = cx + visibleHalf - 30, minY = cy - visibleHalfH + 30, maxY = cy + visibleHalfH - 30 - (visibleHalfH > visibleHalf * 1.3 ? visibleHalfH * .2 : 0);   // телефон: низ экрана — под подсказку «Листайте»
    const taken = [];
    for (const n of incoming) {
      n.x = n.y = null;
      const hw = 150 * n.size * boost * .92, hh = 75 * n.size * boost * .92;
      for (let f = .95; f < 2.6; f += .06) {
        const x = heart.x + Math.cos(n.angle) * heart.rx * f, y = heart.y + Math.sin(n.angle) * heart.ry * f;
        if (x - hw < minX || x + hw > maxX || y - hh < minY || y + hh > maxY) continue;
        // Вокруг заголовка и цифр — свободное поле, иначе белые буквы сливаются с розовыми записками.
        const pad = 36 * boost;
        if (text.some(b => x + hw > b.l - pad && x - hw < b.r + pad && y + hh > b.t - pad && y - hh < b.b + pad)) continue;
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
      // Пока записки не полетели, заголовок ещё въезжает — места пересчитываем по его финальному положению.
      if (u < 2.45) placedFor = 0;   // записки ещё не летят — место выберем, когда сцена встанет
      else if (!placedFor && section.querySelector('.thanks-title')?.getBoundingClientRect().width) { place(sceneScale); placedFor = 1; }
      layer.begin();
      const { ctx } = layer;
      for (const n of incoming) {
        const t = clamp((u - n.t0) / .22); if (t <= 0 || n.x === null) continue;
        // Прилетает из-за края по тому же лучу и садится на своё место.
        const e = outBack(t), fx = heart.x + Math.cos(n.angle) * heart.rx * 3.2, fy = heart.y + Math.sin(n.angle) * heart.ry * 3.2;
        const x = fx + (n.x - fx) * e, y = fy + (n.y - fy) * e;
        ctx.save(); ctx.translate(x, y); ctx.rotate((n.spin * (1 + (1 - e) * 6)) * Math.PI / 180);
        const s = n.size * boost * (.6 + .4 * Math.min(1, e)); ctx.globalAlpha = Math.min(1, t * 3);
        ctx.drawImage(n.card, -150 * s, -75 * s, 300 * s, 150 * s); ctx.restore();
      }
      ctx.globalAlpha = 1;
    },
    release: layer.release,
  };
}

// A small edition of illustrated cards emerges from the mouth of the envelope.
export function createPostcardPrints(section) {
  const stage = section.querySelector('.envelope-stage');
  const layer = document.createElement('div');
  layer.className = 'postcard-prints';
  layer.setAttribute('aria-hidden','true');
  const received = Number(section.querySelector('.envelope-received').dataset.value);
  const sent = Number(section.querySelector('.envelope-sent').dataset.value);
  const count = Math.min(3, Math.max(received,sent));
  const cards = Array.from({length:count}, (_,i) => {
    const img = new Image();
    img.src = './assets/envelope/prints/'+i+'.webp';
    img.alt = '';
    layer.append(img);
    return img;
  });
  // Широкий экран: на «отправили» из конверта вылетает ещё стайка открыток и
  // разлетается по бокам (на телефоне места нет — там только три открытки).
  const SENT_FLOCK = [
    { x: -.36, y: -.20, r: -14, s: .92, d: 0 },   { x: .35, y: -.24, r: 12, s: .96, d: .03 },
    { x: -.27, y: .06, r: 9, s: .78, d: .06 },    { x: .29, y: .03, r: -10, s: .82, d: .09 },
    { x: -.44, y: -.34, r: -6, s: .7, d: .12 },   { x: .43, y: -.06, r: 7, s: .72, d: .15 },
  ];
  const flock = sent > 0 && !matchMedia('(prefers-reduced-motion: reduce)').matches
    ? SENT_FLOCK.slice(0, Math.min(SENT_FLOCK.length, sent)).map((f, i) => {
      const img = new Image(); img.src = './assets/envelope/prints/' + (i % 3) + '.webp'; img.alt = ''; img.className = 'is-sent-flock';
      layer.append(img); return { img, ...f };
    }) : [];
  stage.append(layer);
  let width, height, mouth, envelopeScale;
  function resize(scale,shift=0) {
    envelopeScale=scale;
    width=stage.clientWidth;
    height=stage.clientHeight;
    mouth=height/2+(shift+2059*.07)*scale;
  }
  function draw(progress) {
    const portrait=width/height<.8;
    if (!portrait) {
      // The paper insert carries the data. The prints emerge behind it and
      // travel only while the envelope opens, leaving the reading pose clear.
      const size=Math.min(430*envelopeScale,width*.16);
      const reach=Math.min(width*.47,1740*envelopeScale);
      cards.forEach((card,i)=>{
        const flight=clamp((progress-.17-i*.055)/.32);
        const outward=i<sent ? flight : 1-flight;
        const t=smooth(outward);
        const side=i===1 ? 1 : -1;
        const lift=[440,380,710][i]*envelopeScale;
        const x=width*.5+side*reach*t;
        const y=mouth-lift*t-Math.sin(Math.PI*t)*envelopeScale*(i===2?120:230);
        card.style.width=size+'px';
        card.style.opacity=smooth(clamp(flight/.12))*(1-smooth(clamp((flight-.70)/.30)));
        card.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%) rotate(${side*(3+12*t)}deg) scale(${.68+.32*t})`;
      });
      // Стайка «отправленных»: вылетает, пока появляется вторая цифра (.70–.90), и остаётся в кадре.
      const flockSize=Math.min(560*envelopeScale,width*.1);
      flock.forEach(f=>{
        const t=smooth(clamp((progress-.7-f.d*.5)/.13));   // к остановке (~.92) все уже на местах
        const x=width*.5+f.x*width*t, y=mouth+(f.y*height-height*.06)*t-Math.sin(Math.PI*t)*height*.12;
        f.img.style.display='';
        f.img.style.width=flockSize*f.s+'px';
        f.img.style.opacity=String(smooth(clamp(t/.18)));
        f.img.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%) rotate(${f.r*t}deg) scale(${.5+.5*t})`;
      });
      return;
    }
    flock.forEach(f=>{ f.img.style.display='none'; });
    const size=Math.min(width*.29,height*.19,190);
    const fanY=Math.min(height-size*.45-12,height*.84);
    cards.forEach((card,i)=>{
      const slot=i-(count-1)/2;
      const t=smooth(clamp((progress-.23-i*.055)/.25));
      const leave=i<sent ? smooth(clamp((progress-.60-i*.06)/.19)) : 0;
      const startX=width*.5, endX=startX+slot*size*.94;
      const arc=Math.sin(Math.PI*t);
      const fanX=startX+(endX-startX)*t;
      const fanTop=mouth+(fanY-mouth)*t-arc*height*.13+Math.abs(slot)*size*.10*t;
      // Side cards peel off towards opposite edges. The middle card glides
      // towards the viewer, leaving the counters clear above the envelope.
      const side=count===1 ? 1 : Math.sign(slot);
      const exitX=side<0 ? -size : side>0 ? width+size : endX+size*.25;
      const exitY=side ? fanY-height*.16 : height+size;
      const x=fanX+(exitX-fanX)*leave;
      const y=fanTop+(exitY-fanTop)*leave-Math.sin(Math.PI*leave)*size*.28;
      card.style.width=size+'px';
      card.style.opacity=Math.min(1,t*5)*(1-smooth(clamp((leave-.78)/.22)));
      card.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%) rotate(${slot*10*t-arc*7+leave*(side || .4)*17}deg) scale(${.45+.55*t+leave*.08})`;
    });
  }
  return {resize,draw};
}

// Older preview tabs still import this entry point.
export { createPostcardPrints as createPostcardGarland };
