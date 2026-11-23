// Страница «итогов нет»: у пользователя за год нет ни одного блока данных.
// Собрана из обложки — тот же ролик с «2026» в гирлянде и заголовок «ИТОГИ»,
// снизу — карточка с объяснением. Показывается вместо всех сцен (проверка: ?empty).
import { isPortrait } from './layout-fit.js';

const BLOCKS = ['thanks', 'postcards', 'moments', 'income', 'ai', 'talkContact', 'zodiac', 'profileViews', 'achievements', 'coins', 'spending', 'learning', 'office'];

export function isEmptyRecap(data) {
  return !BLOCKS.some(key => data[key]);
}

export function createEmptyState(data) {
  const intro = data.intro || {};
  const portrait = isPortrait(innerWidth, innerHeight);
  const poster = portrait ? './assets/restyle/cover-phone.jpg' : './assets/restyle/cover-desk.jpg';
  const loop = portrait ? intro.loopVideoMobile || './assets/restyle/loop-phone.mp4' : intro.loopVideo || './assets/restyle/loop-desk.mp4';
  const copy = data.empty || {};

  const section = document.createElement('section');
  section.className = 'recap-empty';
  section.id = 'intro';
  section.setAttribute('aria-labelledby', 'recap-empty-title');
  section.innerHTML = `
    <div class="recap-empty-media" aria-hidden="true">
      <img class="recap-empty-poster" alt="" />
      <video class="recap-empty-loop" muted playsinline loop preload="auto" disablepictureinpicture tabindex="-1"></video>
    </div>
    <div class="recap-empty-shade" aria-hidden="true"></div>
    <header class="recap-empty-head">
      <p class="recap-empty-title" aria-hidden="true"></p>
      <p class="recap-empty-subtitle" aria-hidden="true"></p>
    </header>
    <div class="recap-empty-card">
      <h1 class="recap-empty-heading" id="recap-empty-title"></h1>
      <p class="recap-empty-text"></p>
      <button class="recap-empty-button" type="button"></button>
    </div>`;
  section.querySelector('.recap-empty-poster').src = poster;
  const video = section.querySelector('video');
  video.muted = video.defaultMuted = true;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) video.remove(); else video.src = loop;
  section.querySelector('.recap-empty-title').textContent = intro.title || 'ИТОГИ';
  section.querySelector('.recap-empty-subtitle').textContent = intro.caption || 'в Alfa people';
  section.querySelector('.recap-empty-heading').textContent = copy.title || 'Кажется, гирлянды запутались';
  section.querySelector('.recap-empty-text').textContent = copy.text || 'Не получилось загрузить ваши итоги. Обновите страницу — попробуем ещё раз';
  const button = section.querySelector('.recap-empty-button');
  button.textContent = copy.button || 'Обновить страницу';
  button.addEventListener('click', () => location.reload());
  return section;
}

export function mountEmptyState(root, signal) {
  const section = root.querySelector('.recap-empty');
  if (!section) return;
  const video = section.querySelector('video');
  if (video) {
    // Ролик заменяет картинку, только когда реально пошёл: иначе остаётся обложка.
    video.addEventListener('playing', () => section.classList.add('is-playing'), { signal });
    video.play()?.catch(() => {});
    document.addEventListener('visibilitychange', () => { if (document.hidden) video.pause(); else video.play()?.catch(() => {}); }, { signal });
  }
  requestAnimationFrame(() => section.classList.add('is-in'));
  signal.addEventListener('abort', () => { video?.pause(); video?.removeAttribute('src'); video?.load(); }, { once: true });
}
