import { isPortrait } from './layout-fit.js';
import { getQuality } from './performance.js';
import { optimizedAssetUrl } from './resources.js';
// Native video playback keeps decoding off the main animation thread.
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

export function createFilmHero(data) {
  const section = document.createElement('section');
  section.className = 'hero hero-film';
  section.id = 'intro';
  section.dataset.designHeight = '1401';
  section.dataset.filmPhase = 'reveal';
  section.setAttribute('aria-label', `${data.intro.title} ${data.year} ${data.intro.caption}`);
  section.innerHTML = `
    <div class="hero-video-slot hero-film-stage" data-name="Video" data-node-id="2943:1939" aria-hidden="true">
      <img class="hero-film-poster" width="1280" height="948" alt="" />
      <video class="hero-film-reveal" muted playsinline preload="none" disablepictureinpicture tabindex="-1"></video>
      <video class="hero-film-loop" muted playsinline preload="none" loop disablepictureinpicture tabindex="-1"></video>
    </div>
    <h1 class="hero-title"><span class="hero-heading-copy"></span></h1>
    <p class="hero-subtitle"><span class="hero-subtitle-copy"></span></p>
    <button class="hero-film-play" type="button" hidden>Запустить анимацию</button>
  `;
  section.querySelector('.hero-heading-copy').textContent = data.intro.title;
  section.querySelector('.hero-film-poster').src = optimizedAssetUrl(data.intro.poster);
  const subtitle = section.querySelector('.hero-subtitle-copy');
  if (data.intro.captionArtwork && data.intro.caption === 'В Alfa people') {
    const label = document.createElement('span'); label.className = 'sr-only'; label.textContent = data.intro.caption;
    const image = document.createElement('img'); image.src = data.intro.captionArtwork; image.width = 398; image.height = 57; image.alt = ''; image.setAttribute('aria-hidden', 'true');
    subtitle.append(image, label);
  } else subtitle.textContent = data.intro.caption;
  // На вертикальном экране — вертикальные ролики, если они есть.
  const portrait = isPortrait(innerWidth, innerHeight) && data.intro.revealVideoMobile;
  const revealSource = portrait ? data.intro.revealVideoMobile : data.intro.revealVideo;
  const loopSource = portrait ? data.intro.loopVideoMobile : data.intro.loopVideo;
  section.classList.toggle('is-film-portrait', Boolean(portrait));
  if (!loopSource) section.querySelector('.hero-film-loop').remove();
  for (const [kind, source] of [['reveal',revealSource],['loop',loopSource]]) {
    if (!source) continue;
    const video = section.querySelector(`.hero-film-${kind}`);
    video.muted = video.defaultMuted = true;
    video.src = source;
  }
  return section;
}

export function mountHeroFilm(hero, signal) {
  const reveal = hero.querySelector('.hero-film-reveal');
  const loop = hero.querySelector('.hero-film-loop');
  const button = hero.querySelector('.hero-film-play');
  let visible = false, phase = 'reveal', playing = null, pending = null, videoFrame = null;
  let failed = false;
  const canPlay = () => visible && (!hero.hasAttribute('data-in-story') || hero.dataset.storyActive === 'true') && !document.hidden && !reducedMotion.matches && !signal.aborted && !failed;
  const active = () => phase === 'reveal' || !loop ? reveal : loop;
  function showLoop() {
    if (signal.aborted || phase !== 'handoff') return;
    phase = 'loop'; hero.dataset.filmPhase = 'loop';
    reveal.pause();reveal.removeAttribute('src');reveal.load();
  }
  function firstLoopFrame() {
    if (phase !== 'handoff' || signal.aborted) return;
    if (loop.requestVideoFrameCallback) {
      if (videoFrame === null) videoFrame = loop.requestVideoFrameCallback(() => { videoFrame = null; showLoop(); });
    } else showLoop();
  }
  // На телефоне декодеры вертикальных роликов (1072×1928) держат заметную память:
  // когда первый экран далеко, выгружаем их и возвращаем при возвращении к нему.
  const saved = new Map(); let unloadTimer = 0;
  function unloadVideos() { for (const v of [reveal, loop]) if (v && v.getAttribute('src')) { saved.set(v, v.getAttribute('src')); v.pause(); v.removeAttribute('src'); v.load(); } playing = pending = null; }
  function restoreVideos() { for (const [v, src] of saved) { v.setAttribute('src', src); v.load(); } saved.clear(); }
  function manageMemory() {
    const away = hero.hasAttribute('data-in-story') && hero.dataset.storyActive !== 'true';
    if (getQuality() === 'lite' && away) { if (!unloadTimer && !saved.size) unloadTimer = setTimeout(() => { unloadTimer = 0; unloadVideos(); }, 1500); }
    else { clearTimeout(unloadTimer); unloadTimer = 0; if (saved.size) restoreVideos(); }
  }
  function sync() {
    manageMemory();
    hero.classList.toggle('is-film-reduced', reducedMotion.matches);
    hero.classList.toggle('is-hero-active', canPlay());
    if (phase === 'done') return;   // вступление закончилось — стоим на последнем кадре
    if (!canPlay()) {
      reveal.pause(); loop?.pause(); playing = null;
      return;
    }
    const video = active();
    if (pending === video || (playing === video && !video.paused)) return;
    hero.classList.add('is-film-started');
    pending = video;
    video.play().then(() => {
      if (pending === video) pending = null;
      if (!canPlay() || video !== active()) { video.pause(); return; }
      playing = video; button.hidden = true;
      firstLoopFrame();
    }).catch(error => {
      if (pending === video) pending = null;
      if (signal.aborted || !canPlay()) return;
      // A fast scroll out and back can interrupt an unresolved play().
      if (error.name === 'AbortError') { sync(); return; }
      button.hidden = false;
      // Preserve the last decoded frame while waiting for a user gesture.
    });
  }
  reveal.addEventListener('ended', () => {
    playing = null;
    if (!loop) { phase = 'done'; hero.dataset.filmPhase = 'done'; return; }
    phase = 'handoff'; hero.dataset.filmPhase = 'handoff';
    firstLoopFrame(); sync();
  }, { signal });
  loop?.addEventListener('playing', firstLoopFrame, { signal });
  for (const video of [reveal,loop].filter(Boolean)) video.addEventListener('error', () => {
    if (saved.has(video) || !video.getAttribute('src')) return;   // выгружено намеренно
    if(video===reveal&&phase==='loop')return;
    failed = true; hero.classList.add('has-film-error'); reveal.pause(); loop?.pause();
  }, { signal });
  button.addEventListener('click', () => { playing = pending = null; sync(); }, { signal });
  hero.addEventListener('story:hero-visibility', sync, { signal });
  document.addEventListener('visibilitychange', sync, { signal });
  reducedMotion.addEventListener('change', sync, { signal });
  const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, { threshold: .04 });
  observer.observe(hero);
  signal.addEventListener('abort', () => {
    observer.disconnect();
    if (videoFrame !== null) loop?.cancelVideoFrameCallback?.(videoFrame);
    for (const video of [reveal,loop].filter(Boolean)) { video.pause(); video.removeAttribute('src'); video.load(); }
  }, { once: true });
  sync();
}
