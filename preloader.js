import { LOADING } from './copy.js';
import { envelopeSequence } from './envelope.js?local=28';
import { preloadAssets, resourceUrl, resourceJSON } from './resources.js';
const overlay = document.querySelector('#preloader');
const percent = overlay.querySelector('.preloader-percent');
const bar = overlay.querySelector('[role="progressbar"]');
const status = overlay.querySelector('.preloader-status');
const retry = overlay.querySelector('button');
let highest = 0;
export function showLoading() {
  highest = 0;
  document.body.classList.add('is-loading');
  overlay.classList.remove('is-leaving');
  document.body.classList.remove('is-revealing');
  overlay.hidden = false;
  overlay.classList.remove('has-error');
  retry.hidden = true;
  status.textContent = 'Загружаем изображения и анимации';
  const shell = document.querySelector('#recap-shell');
  shell.inert = true;
  shell.setAttribute('aria-busy', 'true');
  setProgress(0);
  startJokes();
}
// Пока грузится — шутки по кругу.
const joke = overlay.querySelector('.preloader-joke');
// Тёмная загрузка: вместо шуток — полутаинственные фразы, по одной, с затуханием.
const jokes = LOADING;
let jokeIndex = 0, jokeTimer = 0;
function startJokes() {
  clearInterval(jokeTimer);
  if (!joke || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  jokeTimer = setInterval(() => {
    jokeIndex = (jokeIndex + 1) % jokes.length;
    joke.textContent = jokes[jokeIndex];
    joke.classList.remove('is-swapping'); void joke.offsetWidth; joke.classList.add('is-swapping');
  }, 2600);
}
const number = overlay.querySelector('.preloader-number');
function setProgress(value) {
  const next = Math.max(highest, Math.min(100, Math.floor(value)));
  if (next === highest && percent.textContent === String(next)) return;
  highest = next;
  percent.textContent = String(next);
  bar.setAttribute('aria-valuenow', String(next));
  overlay.style.setProperty('--load-progress', next / 100);
}
export function showLoadError(error) {
  overlay.classList.add('has-error');
  clearInterval(jokeTimer);
  if (joke) joke.textContent = 'Что-то пошло не так';
  status.textContent = 'Не всё удалось загрузить. Проверьте соединение и попробуйте ещё раз.';
  retry.hidden = false;
  console.error('Recap loading:', error);
}
export function onRetry(callback) { retry.addEventListener('click', callback); }
export function openRecap() {
  setProgress(100);
  clearInterval(jokeTimer);
  const shell = document.querySelector('#recap-shell');
  shell.inert = false;
  shell.removeAttribute('aria-busy');
  document.body.classList.remove('is-loading');
  // Curtain exit: the red loader wipes upward and the first scene settles in
  // beneath it, instead of a hard cut from the loader to the film.
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !overlay.animate) { overlay.hidden = true; return; }
  document.body.classList.add('is-revealing');
  overlay.classList.add('is-leaving');
  const done = () => {
    if (!overlay.classList.contains('is-leaving')) return;
    overlay.classList.remove('is-leaving');
    overlay.hidden = true;
  };
  overlay.addEventListener('animationend', event => { if (event.target === overlay) done(); }, { once: false });
  setTimeout(done, 1600);
  setTimeout(() => document.body.classList.remove('is-revealing'), 1900);
}
export async function waitForPreparation(promise, signal) {
  let timer, abort;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Preparation timeout')), 45000);
      abort = () => reject(signal.reason);
      signal.addEventListener('abort', abort, { once: true });
      if (signal.aborted) abort();
    })]);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}
// Reject rather than exposing a partially loaded landing. Also clean up on retry.
export function waitForMedia(element, signal) {
  if (element.readyState >= 2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error('Media readiness timeout')), 45000);
    const ready = () => finish();
    const error = () => finish(new Error('Video decoding failed'));
    const abort = () => finish(signal.reason);
    function finish(error) {
      clearTimeout(timer);
      element.removeEventListener('loadeddata', ready);
      element.removeEventListener('error', error);
      signal.removeEventListener('abort', abort);
      error ? reject(error) : resolve();
    }
    element.addEventListener('loadeddata', ready, { once: true });
    element.addEventListener('error', error, { once: true });
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
  });
}
export async function prepareContent(root, data, signal) {
  const urls = [...root.querySelectorAll('img')].map(image => image.src);
  // These fonts also supply live canvas/WebGL text, without DOM glyph nodes.
  const families=new Set(root.querySelector('.income-glass')?['Agse','Nauryz','Styrene','Formular']:[]);
  // Only active DOM/pseudo styles: legacy stylesheets contain large assets
  // belonging to screens that are no longer rendered.
  for(const element of [root,...root.querySelectorAll('*'),document.querySelector('.recap-grain')]) {
    if(!element || element.namespaceURI!=='http://www.w3.org/1999/xhtml')continue;
    const style=getComputedStyle(element);if(style.display==='none')continue;
    for(const family of style.fontFamily.split(','))families.add(family.trim().replaceAll('"','').replaceAll("'",''));
    for(const target of [style,getComputedStyle(element,'::before'),getComputedStyle(element,'::after')]) {
      if(target!==style&&(target.content==='none'||target.display==='none'))continue;
      for(const value of [target.backgroundImage,target.maskImage,target.borderImageSource])for(const match of (value||'').matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
        const candidate=new URL(match[1],document.baseURI);if(candidate.hash&&candidate.pathname===location.pathname)continue;
        urls.push(candidate.href);
      }
    }
  }
  for(const image of root.querySelectorAll('svg image')) {
    const href=image.getAttribute('href')||image.getAttribute('xlink:href');if(href&&!href.startsWith('data:'))urls.push(href);
  }
  if(data.talkContact?.photo)urls.push(data.talkContact.photo);
  // Видео без адреса (статичная картинка вместо ролика) не ждём.
  const videos = [...root.querySelectorAll('video')].filter(video => video.getAttribute('src'));
  videos.forEach(video => urls.push(video.src, video.poster));
  if (root.querySelector('.is-envelope-still') && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    urls.push(...envelopeSequence);
  }
  if (data.intro && data.intro.mode !== 'video' && data.year === data.intro.mediaYear) {
    for (let i = 0; i < data.intro.frameCount; i++) urls.push(new URL(`${String(i).padStart(5, '0')}.webp`, data.intro.frameBase).href);
  }
  if (data.parksharing?.sequence) {
    const sequence = data.parksharing.sequence;
    for (let i = 0; i < sequence.frameCount; i++) urls.push(new URL(`frame-${String(i).padStart(4, '0')}.webp`, sequence.base).href);
  }
  if (data.achievements) {
    for (let i = 0; i < 16; i++) urls.push(`./assets/achievement-edge-${String(i).padStart(2, '0')}.svg`);
    urls.push('./assets/optimized/achievement-texture.webp');
  }
  await preloadAssets(urls, { signal, onProgress: progress => setProgress(progress * 94) });
  status.textContent = 'Готовим анимации';
  signal.throwIfAborted();
  // На телефоне декодируем заранее только первый экран: остальные картинки
  // декодируются, когда до них доходят. Иначе разом ~200 МБ растров в памяти.
  const lite = document.documentElement.dataset.quality === 'lite';
  // Картинки без адреса (фон неба, кадр машины) заполняются кодом позже — их не трогаем.
  const allImages=[...root.querySelectorAll('img')].filter(image=>image.getAttribute('src'));
  const firstScreen = root.querySelector('.story-panel-hero, .hero');
  if (lite) for (const image of allImages) if (!firstScreen?.contains(image)) { image.decoding = 'async'; image.src = resourceUrl(image.src); }
  const imageNodes = lite ? allImages.filter(image => firstScreen?.contains(image)) : allImages;
  let cursor=0;
  const images = Array.from({length:Math.min(3,imageNodes.length)},async()=>{while(cursor<imageNodes.length){const image=imageNodes[cursor++];
    image.loading = 'eager';
    image.src = resourceUrl(image.src);
    await image.decode();
  }});
  for(const image of root.querySelectorAll('svg image')) {
    const href=image.getAttribute('href')||image.getAttribute('xlink:href');
    if(href&&!href.startsWith('data:'))image.setAttribute('href',resourceUrl(href));
  }
  const fonts = [...document.fonts].filter(font=>families.has(font.family.replaceAll('\"','').replaceAll("'",''))).map(font => font.load());
  await waitForPreparation(Promise.all([...images, ...fonts, ...videos.map(async video => {
    if (video.poster) video.poster = resourceUrl(video.poster);
    video.src = resourceUrl(video.src);
    video.preload = 'auto';
    const ready = waitForMedia(video, signal);
    video.load();
    await ready;
  })]), signal);
  signal.throwIfAborted();
  setProgress(98);
}
