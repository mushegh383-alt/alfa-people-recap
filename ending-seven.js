import { setTextScale } from './typography.js';
import { requestRenderFrame as requestAnimationFrame, cancelRenderFrame as cancelAnimationFrame, markSoftGlows, getQuality } from './performance.js';
import { endingSevenFrames, finaleFrame, endingVectorPose } from './ending-seven-layout.js';
import { createOffice as createOriginalOffice } from './blocks/ending.js';
import { endingChapterFrame, endingSceneProgress, toEndingAnchor } from './ending-chapter-layout.js';
import { ease } from './november-layout.js';
import { fitScale, placeComposition } from './layout-fit.js';
import { createOfficeTower } from './sky-scenes.js';
const assets = './assets/ending-seven/';
const ns = 'http://www.w3.org/2000/svg';
const blurredBackdrops = new Map();

function scene(id, label, html) {
  const s = document.createElement('section'); s.id = id; s.className = `ending-seven ${id}`; s.setAttribute('aria-label', label);
  s.innerHTML = `<div class="ending-seven-stage"><div class="ending-seven-composition"><div class="ending-seven-world">${html}</div></div></div>`;
  return s;
}
export function createOffice(data) {
  const section = createOriginalOffice(data);
  section.classList.add('office-restored');
  const composition = section.querySelector('.ending-composition');
  const back = document.createElement('div'); back.className = 'office-seven-back ending-vector-art'; back.setAttribute('aria-hidden','true');
  const front = document.createElement('div'); front.className = 'office-seven-foreground ending-vector-art'; front.setAttribute('aria-hidden','true');
  composition.prepend(back); composition.append(front);
  return section;
}
export function createFinale(data) {
  const s = scene('finale', 'Ваш талисман следующего года', `<div class="finale-seven-art ending-vector-art" aria-hidden="true"></div><div class="finale-seven-core"><h2 class="finale-seven-title"></h2><div class="finale-seven-stamp"><img class="finale-seven-frame" src="${assets}stamp-frame.svg" alt="" /><img class="finale-seven-mascot" alt="" /></div><h3 class="finale-seven-name"></h3><p class="finale-seven-caption"></p><div class="finale-seven-action-slot"></div></div>`);
  s.querySelector('.finale-seven-title').textContent = data.finale.heading.replace(/\s+(\d{4})/u, '\n$1');
  s.querySelector('.finale-seven-name').textContent = data.finale.talisman;
  s.querySelector('.finale-seven-caption').textContent = data.finale.label;
  const image = s.querySelector('.finale-seven-mascot'); image.src = data.finale.talismanImage; image.alt = data.finale.talisman;
  const ghost = document.createElement('img'); ghost.className = 'finale-seven-ghost'; ghost.src = data.finale.talismanImage; ghost.alt = ''; ghost.setAttribute('aria-hidden','true');
  ghost.dataset.source = data.finale.talismanImage;
  s.querySelector('.finale-seven-core').prepend(ghost);
  const button = document.createElement(data.finale.gameUrl ? 'a' : 'button'); button.className = 'finale-seven-action'; button.textContent = data.finale.buttonLabel;
  if (data.finale.gameUrl) button.href = data.finale.gameUrl;
  else { button.type = 'button'; button.setAttribute('aria-disabled', 'true'); }
  s.querySelector('.finale-seven-action-slot').append(button);
  return s;
}

export function createEndingChapter(data) {
  // Офис — новая сцена «Офис-высотка» (окна-дни); прежний ящик из Figma больше не используется.
  if (!data.office || !data.finale) return [data.office && createOfficeTower(data), data.finale && createFinale(data)].filter(Boolean);
  const chapter = document.createElement('div'); chapter.className = 'ending-chapter';
  const pin = document.createElement('div'); pin.className = 'ending-chapter-pin';
  pin.append(createOfficeTower(data), createFinale(data)); chapter.append(pin);
  return [chapter];
}

async function loadVectors(slot, name, kind, offset, signal) {
  if (!slot) return;
  const response = await fetch(assets + name, { signal: AbortSignal.any([signal, AbortSignal.timeout(30000)]) });
  if (!response.ok) throw Error(`Не удалось загрузить композицию: ${name}`);
  const source = new DOMParser().parseFromString(await response.text(), 'image/svg+xml');
  if (source.querySelector('parsererror')) throw Error(`Некорректная композиция: ${name}`);
  const svg = document.importNode(source.documentElement, true);
  svg.classList.add('ending-seven-svg');
  markSoftGlows(svg);
  // Exported backdrop circles become real lenses sampling the moving artwork.
  svg.querySelectorAll('foreignObject').forEach(n => n.remove());
  for (const group of [...svg.querySelectorAll('[data-figma-bg-blur-radius]')]) {
    const circle = group.querySelector('circle'); if (!circle) continue;
    let x = Number(circle.getAttribute('cx')), y = Number(circle.getAttribute('cy')); const r = Number(circle.getAttribute('r'));
    const matrix = circle.getAttribute('transform')?.match(/matrix\(([^)]+)\)/)?.[1].split(/[ ,]+/).map(Number);
    if (matrix) { const ox = x; x = matrix[0] * ox + matrix[2] * y + matrix[4]; y = matrix[1] * ox + matrix[3] * y + matrix[5]; }
    const lens = document.createElement('div'); lens.className = 'ending-seven-lens';
    Object.assign(lens.style, { left: `${x - r}px`, top: `${y - offset - r}px`, width: `${r * 2}px`, height: `${r * 2}px` });
    lens.dataset.lensSide = x < 960 ? '-1' : '1'; slot.append(lens); group.remove();
  }
  const groups = kind === 'finale' ? [...svg.querySelector('[id="Group 2131328757"]').children].flatMap(side => [...side.children].map(el => ({ el, side: side.id.endsWith('9092') ? -1 : 1 }))) : [...svg.children].filter(el => el.localName !== 'defs').map((el, i) => ({ el, side: el.id.includes('234257090') || el.id.includes('9001') ? 1 : -1 }));
  groups.forEach(({ el, side }, index) => { const g = document.createElementNS(ns, 'g'); g.dataset.vectorLayer = ''; g.dataset.vectorIndex = index; g.dataset.vectorSide = side; el.before(g); g.append(el); });
  // Each inline SVG keeps a private reference namespace.
  const prefix = name.replace(/\W/g, '') + '-';
  for (const el of svg.querySelectorAll('*')) {
    for (const attr of [...el.attributes]) {
      let v = attr.value.replace(/url\(#([^)]*)\)/g, (_, id) => `url(#${prefix}${id})`);
      if (attr.localName === 'href' && v.startsWith('#')) v = '#' + prefix + v.slice(1);
      if (attr.name === 'id') v = prefix + v;
      el.setAttributeNS(attr.namespaceURI, attr.name, v);
    }
  }
  slot.prepend(svg);
}
export async function prepareEndingSeven(root, signal) {
  await Promise.all([
    loadVectors(root.querySelector('.office-seven-back'), 'office-back-vectors.svg', 'office', 26590, signal),
    loadVectors(root.querySelector('.office-seven-foreground'), 'office-front-vectors.svg', 'office', 26590, signal),
    loadFinaleSurfaces(root.querySelector('.finale-seven-art'), signal),
  ]);
}

async function loadFinaleSurfaces(slot, signal) {
  if (!slot) return;
  const response = await fetch(assets+'cached/layers.json', {signal});
  if (!response.ok) throw Error(`Finale surfaces: ${response.status}`);
  const {layers,lenses}=await response.json();
  for (const layer of layers) {
    const wrapper=document.createElement('div'); wrapper.className='ending-cached-layer';
    wrapper.dataset.vectorLayer='';wrapper.dataset.vectorIndex=layer.index;wrapper.dataset.vectorSide=layer.side;
    const image=document.createElement('img');image.src=assets+'cached/'+layer.src;image.alt='';
    Object.assign(image.style,{left:`${layer.x-960}px`,top:`${layer.y-733.5}px`,width:`${layer.width}px`,height:`${layer.height}px`});
    wrapper.append(image);slot.append(wrapper);
  }
  for (const {x,y,radius,side,src} of lenses) {
    const lens=document.createElement('div');lens.className='ending-seven-lens is-cached-lens';lens.dataset.lensSide=side;
    Object.assign(lens.style,{left:`${x}px`,top:`${y}px`,width:`${radius*2}px`,height:`${radius*2}px`});
    const image=document.createElement('img');image.src=assets+'cached/'+src;image.alt='';lens.append(image);slot.append(lens);
  }
  if (getQuality() !== 'full') await flattenFinale(slot, layers, lenses, signal).catch(error => { if (!signal.aborted) console.warn('Finale stays layered:', error); });
}

// Слабые устройства и телефоны: 16 движущихся слоёв + 4 линзы под маской —
// самый тяжёлый кадр сайта. Один раз склеиваем их в финальную композицию
// (в конце анимации все слои стоят на местах без сдвигов), запекаем в неё
// вертикальную маску и дальше двигаем одну картинку.
async function flattenFinale(slot, layers, lenses, signal) {
  const images = [...slot.querySelectorAll('img')];
  await Promise.all(images.map(img => img.decode().catch(() => {})));
  signal.throwIfAborted();
  const boxes = [
    ...layers.map(l => ({ x: l.x, y: l.y, w: l.width, h: l.height })),
    ...lenses.map(l => ({ x: l.x, y: l.y, w: l.radius * 2, h: l.radius * 2 })),
  ];
  const minX = Math.min(...boxes.map(b => b.x)), minY = Math.max(0, Math.min(...boxes.map(b => b.y)));
  const maxX = Math.max(...boxes.map(b => b.x + b.w)), maxY = Math.min(1467, Math.max(...boxes.map(b => b.y + b.h)));
  const k = .6, canvas = document.createElement('canvas');
  canvas.width = Math.ceil((maxX - minX) * k); canvas.height = Math.ceil((maxY - minY) * k);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(k, 0, 0, k, -minX * k, -minY * k);
  const wrappers = [...slot.querySelectorAll('.ending-cached-layer')];
  layers.forEach((l, i) => { const img = wrappers[i]?.querySelector('img'); if (img?.naturalWidth) ctx.drawImage(img, l.x, l.y, l.width, l.height); });
  const lensNodes = [...slot.querySelectorAll('.is-cached-lens')];
  lenses.forEach((l, i) => { const img = lensNodes[i]?.querySelector('img'); if (img?.naturalWidth) ctx.drawImage(img, l.x, l.y, l.radius * 2, l.radius * 2); });
  // Та же маска, что в CSS: прозрачно сверху → видно с 7% → гаснет после 82%.
  ctx.globalCompositeOperation = 'destination-in';
  const fade = ctx.createLinearGradient(0, 0, 0, 1467);
  fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(.07, '#000'); fade.addColorStop(.82, '#000'); fade.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = fade; ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', .9));
  signal.throwIfAborted();
  if (!blob) return;
  const flat = document.createElement('img');
  flat.className = 'finale-flat'; flat.alt = '';
  flat.src = URL.createObjectURL(blob);
  Object.assign(flat.style, { left: `${minX}px`, top: `${minY}px`, width: `${maxX - minX}px`, height: `${maxY - minY}px` });
  await flat.decode().catch(() => {});
  wrappers.forEach(w => w.remove()); lensNodes.forEach(n => n.remove());
  slot.append(flat); slot.classList.add('is-flattened');
}

// Run once behind the loading screen. Scroll moves a preblurred texture rather
// than filtering an oversized moving image again on every frame.
export async function prepareFinaleBackdrop(root, signal) {
  const ghost=root.querySelector('.finale-seven-ghost');if(!ghost)return;
  const key=ghost.dataset.source;
  try {
    let prepared=blurredBackdrops.get(key);
    if(!prepared) {
      await ghost.decode();signal.throwIfAborted();
      const canvas=document.createElement('canvas');
      const ratio=ghost.naturalWidth/ghost.naturalHeight;
      canvas.height=768;canvas.width=Math.max(1,Math.round(768*ratio));
      const ctx=canvas.getContext('2d');if(!ctx || !('filter' in ctx))return;ctx.filter='blur(10.5px)';ctx.drawImage(ghost,0,0,canvas.width,canvas.height);
      ctx.filter='none';ctx.globalCompositeOperation='destination-in';
      const horizontal=ctx.createLinearGradient(0,0,canvas.width,0);horizontal.addColorStop(0,'transparent');horizontal.addColorStop(.18,'#000');horizontal.addColorStop(.82,'#000');horizontal.addColorStop(1,'transparent');
      ctx.fillStyle=horizontal;ctx.fillRect(0,0,canvas.width,canvas.height);
      const vertical=ctx.createLinearGradient(0,0,0,canvas.height);vertical.addColorStop(0,'transparent');vertical.addColorStop(.12,'#000');vertical.addColorStop(.88,'#000');vertical.addColorStop(1,'transparent');
      ctx.fillStyle=vertical;ctx.fillRect(0,0,canvas.width,canvas.height);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.92));
      signal.throwIfAborted();if(!blob)return;
      prepared=URL.createObjectURL(blob);blurredBackdrops.set(key,prepared);
    }
    ghost.src=prepared;await ghost.decode();ghost.classList.add('is-preblurred');
  } catch(error) {if(signal.aborted)throw error; /* Keep the CSS fallback for unavailable canvas/CORS. */}
}

export function mountEndingMotion(root, signal) {
  const chapter = root.querySelector('.ending-chapter');
  if (chapter) mountChapter(chapter, signal);
  root.querySelectorAll('.ending-seven.finale').forEach(section => mount(section, signal));
  root.querySelectorAll('.office-restored').forEach(section => mountOfficeSurroundings(section, signal));
}
function mount(section, signal) {
  const kind = section.id, final = kind === 'finale', logical = endingSevenFrames[kind];
  const stage = section.querySelector('.ending-seven-stage'), composition = section.querySelector('.ending-seven-composition');
  const layers = [...section.querySelectorAll('[data-vector-layer]')], lenses = [...section.querySelectorAll('.ending-seven-lens')];
  const art=section.querySelector('.finale-seven-art'), ghost=section.querySelector('.finale-seven-ghost'), stamp=section.querySelector('.finale-seven-stamp');
  const flat=section.querySelector('.finale-flat');
  const copy=Object.fromEntries(['title','name','caption','action-slot'].map(name=>[name,section.querySelector(`.finale-seven-${name}`)]));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let raf = 0, active = false, last = 0, p, scale = 1, px = 0, py = 0, tx = 0, ty = 0;
  function fit() { scale = fitScale(stage.clientWidth, stage.clientHeight, logical.width, logical.height, 'finale'); placeComposition(composition, scale); setTextScale(composition, scale, stage.clientWidth, stage.clientHeight); composition.style.setProperty('--ending-art-wide', Math.max(1, stage.clientWidth / (logical.width * scale))); composition.style.setProperty('--ending-art-tall', Math.max(1, stage.clientHeight / (logical.height * scale))); schedule(); }
  function paint(now) {
    raf = 0; if (!active || document.hidden || signal.aborted) return;
    const target = endingSceneProgress(section, innerHeight, reduced.matches), dt = last ? Math.min(64, now - last) : 16; last = now;
    p = p === undefined || reduced.matches ? target : p + (target - p) * (1 - Math.exp(-dt / 100));
    if (Math.abs(target - p) < .0001) p = target;
    px += (tx - px) * (1 - Math.exp(-dt / 150)); py += (ty - py) * (1 - Math.exp(-dt / 150));
    if (reduced.matches) px = py = 0;
    const pointer = { x: px, y: py };
    for (const layer of layers) {
      const f = endingVectorPose(kind, Number(layer.dataset.vectorIndex), Number(layer.dataset.vectorSide), p, pointer, reduced.matches);
      layer.style.visibility = f.reveal > .00001 ? 'visible' : 'hidden';
      layer.style.opacity = Math.min(1, f.reveal * 3);
      layer.style.transform = `translate3d(${f.x}px,${f.y}px,0) rotate(${f.rotate}deg) scale(${f.scale * f.tilt},${f.scale})`;
    }
    lenses.forEach((lens, i) => { const f = endingVectorPose(kind, i + 3, Number(lens.dataset.lensSide), p, pointer, reduced.matches); lens.style.opacity = f.reveal * (reduced.matches ? 1 : ease(.4,.85,p)); lens.style.transform = `translate3d(${f.x * .55}px,${f.y * .6}px,0) scale(${f.scale})`; });
    if (final && flat) {
      // Склеенная композиция: появление — средний «reveal» слоёв, лёгкий наезд.
      let sum = 0; for (let i = 0; i < 10; i++) sum += endingVectorPose(kind, i, 1, p, pointer, reduced.matches).reveal;
      const reveal = sum / 10;
      flat.style.opacity = Math.min(1, reveal * 1.6);
      flat.style.transform = `scale(${(.9 + .1 * reveal).toFixed(4)})`;
    }
    if (final) {
      const f = finaleFrame(p, reduced.matches);
      ghost.style.opacity = .3 * Math.min(1, Math.max(0, p / .45));
      ghost.style.transform = `translate(${px * -12}px,${py * -10}px) scale(${1.12 + (1-p) * .12})`;
      // The spatial camera belongs to the artwork. Keep readable copy out of
      // its zoom so the heading never crosses the top edge mid-transition.
      // На телефонах и слабых машинах без 3D: перспектива на огромном слое и марке
      // с тенью-фильтром мерцала на мобильных GPU. Движение то же, но плоское.
      const flat2d = getQuality() !== 'full';
      art.style.transform = flat2d
        ? `scale(var(--ending-art-wide,1),var(--ending-art-tall,1)) scale(${f.camera})`
        : `scale(var(--ending-art-wide,1),var(--ending-art-tall,1)) perspective(1800px) rotateX(${(f.camera - 1) * 7}deg) rotateY(${(f.camera - 1) * -7}deg) scale(${f.camera})`;
      stamp.style.transform = flat2d
        ? `translate(${px * -18}px,${(1 - f.approach) * 270 - py * 16}px) rotate(${(1 - f.approach) * 17}deg) scale(${f.stampScale * f.camera * (1 - (1 - f.approach) * .35)},${f.stampScale * f.camera})`
        : `perspective(900px) translate(${px * -18}px,${(1 - f.approach) * 270 - py * 16}px) rotateY(${(1 - f.approach) * -54 + px * -3}deg) rotateZ(${(1 - f.approach) * 17}deg) scale(${f.stampScale * f.camera})`;
      stamp.style.opacity = Math.min(1, f.approach * 4);
      for (const [name, amount, distance] of [['title', f.title, 60], ['name', f.name, 70], ['caption', f.caption, 60], ['action-slot', f.button, 90]]) {
        const el = copy[name]; el.style.opacity = amount; el.style.transform = flat2d ? `translateY(${(1 - amount) * distance}px)` : `translateY(${(1 - amount) * distance}px) rotateX(${(1 - amount) * -18}deg)`;
        el.style.visibility = amount > .001 ? 'visible' : 'hidden'; el.inert = amount < .5;
      }
      copy['action-slot'].inert = f.button < .98;
    }
    section.dataset.progress = p.toFixed(4);
    if (Math.abs(target - p) > .0001 || Math.abs(tx - px) + Math.abs(ty - py) > .0002) schedule();
  }
  function schedule() { if (!raf && active && !document.hidden && !signal.aborted) raf = requestAnimationFrame(paint); }
  const observer = new IntersectionObserver(([e]) => { active = e.isIntersecting; section.classList.toggle('is-ending-active', active); if (active) schedule(); else { cancelAnimationFrame(raf); raf = last = 0; } }, { rootMargin: '150px' }); observer.observe(section);
  const resize = new ResizeObserver(fit); resize.observe(stage); fit();
  window.addEventListener('scroll', schedule, { passive: true, signal });
  stage.addEventListener('pointermove', event => { if (event.pointerType === 'touch' || reduced.matches) return; const b = stage.getBoundingClientRect(); tx = Math.max(-1, Math.min(1, (event.clientX - b.left) / b.width * 2 - 1)); ty = Math.max(-1, Math.min(1, (event.clientY - b.top) / b.height * 2 - 1)); schedule(); }, { passive: true, signal });
  stage.addEventListener('pointerleave', () => { tx = ty = 0; schedule(); }, { signal });
  document.addEventListener('visibilitychange', () => { last = 0; schedule(); }, { signal }); reduced.addEventListener('change', schedule, { signal });
  signal.addEventListener('abort', () => { cancelAnimationFrame(raf); observer.disconnect(); resize.disconnect(); }, { once: true });
}

// Decoration follows the original office player's clock; it never replaces or
// approximates that player's native masks, keyframes or texture layers.
function mountOfficeSurroundings(section, signal) {
  const composition=section.querySelector('.ending-composition'),stage=section.querySelector('.ending-stage');
  const layers=[...section.querySelectorAll('[data-vector-layer]')],lenses=[...section.querySelectorAll('.ending-seven-lens')];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function draw(event) {
    const p=event.detail.progress,scale=fitScale(stage.clientWidth,stage.clientHeight,1919,1790,'office');
    composition.style.setProperty('--ending-art-wide',Math.max(1,stage.clientWidth/(1920*scale)));
    composition.style.setProperty('--ending-art-tall',Math.max(1,stage.clientHeight/(1790*scale))*1.35);
    for(const layer of layers){const f=endingVectorPose('office',Number(layer.dataset.vectorIndex),Number(layer.dataset.vectorSide),p,{x:0,y:0},reduced.matches);layer.style.visibility=f.reveal>.00001?'visible':'hidden';layer.style.opacity=Math.min(1,f.reveal*3);layer.setAttribute('transform',`translate(${f.x} ${f.y}) translate(960 27485) rotate(${f.rotate}) scale(${f.scale*f.tilt} ${f.scale}) translate(-960 -27485)`);}
    lenses.forEach((lens,i)=>{const f=endingVectorPose('office',i+3,Number(lens.dataset.lensSide),p,{x:0,y:0},reduced.matches);lens.style.opacity=f.reveal;lens.style.transform=`translate(${f.x*.55}px,${f.y*.6}px) scale(${f.scale})`;});
  }
  section.addEventListener('recap:office-progress',draw,{signal});
}

function mountChapter(chapter, signal) {
  const office = chapter.querySelector('#office'), finale = chapter.querySelector('#finale');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let raf = 0, active = false, last = 0, blend;
  function paint(now) {
    raf = 0; if (!active || document.hidden || signal.aborted) return;
    if (reduced.matches) {
      for (const section of [office, finale]) { section.style.opacity = '1'; section.style.transform = 'none'; section.style.visibility='visible'; section.inert=false; }
      blend=undefined; return;
    }
    const { handoff } = endingChapterFrame(chapter.getBoundingClientRect().top, innerHeight);
    const dt = last ? Math.min(64, now-last) : 16; last=now;
    blend = blend===undefined ? handoff : blend + (handoff-blend)*(1-Math.exp(-dt/100));
    if (Math.abs(handoff-blend)<.0001) blend=handoff;
    // Последовательно, а не одновременно: иначе марка с единорогом из финала
    // проступала поверх цифр офиса. Офис гаснет в первой половине, финал
    // проявляется во второй, с небольшим перекрытием на тёмном фоне.
    const span = (a, b) => { const t = Math.max(0, Math.min(1, (blend - a) / (b - a))); return t * t * (3 - 2 * t); };
    const officeOut = span(0, .6), finaleIn = span(.45, 1);
    office.style.opacity = 1-officeOut;
    office.style.transform = `scale(${1 + blend*.09})`;
    office.style.visibility = officeOut>.9999?'hidden':'visible'; office.inert=blend>.5;
    // Погасший холст офиса убираем совсем: иначе финал над ним Safari держит в отдельных слоях (память iPhone).
    const towerCanvas=office.querySelector('.sky-canvas'); if(towerCanvas) towerCanvas.hidden=officeOut>.9999;
    finale.style.opacity = finaleIn;
    finale.style.visibility = finaleIn<.0001?'hidden':'visible'; finale.inert=blend<.5;
    chapter.dataset.handoff=blend.toFixed(4);
    if (blend!==handoff) schedule();
  }
  function schedule() {if (!raf && active && !document.hidden && !signal.aborted) raf=requestAnimationFrame(paint);}
  const observer=new IntersectionObserver(([entry])=>{active=entry.isIntersecting;if(active)schedule();else{cancelAnimationFrame(raf);raf=last=0;}},{rootMargin:'100px'});observer.observe(chapter);
  window.addEventListener('scroll',schedule,{passive:true,signal});
  window.addEventListener('resize',schedule,{passive:true,signal});
  window.addEventListener('hashchange',()=>toEndingAnchor(chapter.parentElement,location.hash),{signal});
  reduced.addEventListener('change',schedule,{signal});
  document.addEventListener('visibilitychange',()=>{last=0;schedule();},{signal});
  signal.addEventListener('abort',()=>{cancelAnimationFrame(raf);observer.disconnect();},{once:true});
}
