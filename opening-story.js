import { requestRenderFrame as requestAnimationFrame, cancelRenderFrame as cancelAnimationFrame, getQuality } from './performance.js';
import { createThanksNotes } from './scene-fill.js';
import { incomeGlassPose, incomeGlassDigits, incomeGlassGeometry, incomePlanetHandoff } from './income-glass-layout.js';
import { getIncomeGlassRenderer, syncIncomeCapWindow } from './income-glass-motion.js';
import { openingStoryFrame, storyPhase, storyDigits, storyUnit, storyAnchors, storyTravel, sceneDepth } from './opening-story-layout.js';
import { mountEnvelope } from './envelope.js';
import { mountPlanet } from './planet-story.js';
import { mountMoments } from './moments.js';
import { mountTalkContact } from './talk-contact.js';
import { setHeadingScale } from './typography.js';
import { fitScale, placeComposition, screenRect } from './layout-fit.js';

export function createOpeningStory(hero, personal, income, thanks, extra = {}) {
  const section = document.createElement('section');
  section.className = 'opening-story';
  section.classList.toggle('has-film-intro', hero.classList.contains('hero-film'));
  section.setAttribute('aria-label', 'Ваш год: итоги, спасибки, открытки, моменты, топ-1 сервис, Alfa AI и топ-собеседник');
  section.innerHTML = `<div class="story-pin"><div class="story-dark" aria-hidden="true"></div><div class="story-heart-glow" aria-hidden="true"></div></div>`;
  const pin = section.querySelector('.story-pin');
  for (const [key, scene] of Object.entries({ hero, personal, thanks, postcards: extra.postcards, moments: extra.moments, income, planet: extra.planet, contact: extra.contact })) {
    if (!scene) continue;
    const panel = document.createElement('div');
    panel.className = `story-panel story-panel-${key}`;
    if (key === 'hero' || key === 'personal') {
      const camera = document.createElement('div');
      camera.className = `story-camera story-camera-${key}`;
      camera.append(scene);
      panel.append(camera);
    } else panel.append(scene);
    scene.dataset.inStory = '';
    pin.append(panel);
  }
  return section;
}

export function mountOpeningStory(story, signal) {
  const pin = story.querySelector('.story-pin');
  const panels = Object.fromEntries(['hero','personal','thanks','postcards','moments','income','planet','contact'].map(key => [key, story.querySelector(`.story-panel-${key}`)]).filter(([, panel]) => panel));
  const contactMotion = mountTalkContact(story,signal);
  const planetMotion = mountPlanet(story, signal);
  const envelopeMotion = mountEnvelope(story, signal, true);
  const momentsMotion = mountMoments(story.querySelector('.moments'), signal);
  const hero = story.querySelector('.hero');
  const personal = story.querySelector('.personal');
  const income = story.querySelector('.income-glass');
  const thanks = story.querySelector('.thanks');
  const heroCamera = story.querySelector('.story-camera-hero');
  const personalCamera = story.querySelector('.story-camera-personal');
  const heroSequence = hero.querySelector('.hero-video-slot');
  const heroTitle = hero.querySelector('.hero-title');
  const heroStamp = hero.querySelector('.hero-stamp');
  const heroSubtitle = hero.querySelector('.hero-subtitle');
  const heroHeight = Number(hero.dataset.designHeight) || 1441;
  heroCamera.style.height = `${heroHeight}px`;
  const personalHeight = Number(personal.dataset.designHeight) || 1755;
  personalCamera.style.height = `${personalHeight}px`;
  const heroDecor = [...hero.querySelectorAll('.hero-decor')];
  const photo = personal.querySelector('.portrait');
  const name = personal.querySelector('.person-name');
  const count = personal.querySelector('.visit-count');
  const caption = personal.querySelector('.visit-caption');
  const counter = personal.querySelector('.counter');
  counter.replaceChildren();
  const personalSlots = [...counter.dataset.value].map(() => {
    const span = document.createElement('span'); span.className = 'counter-digit'; counter.append(span); return span;
  });
  counter.style.setProperty('--counter-size', `${Math.min(700, 1500 / Math.max(personalSlots.length * .5, 1))}px`);
  const incomeViewport = income.querySelector('.income-glass-viewport');
  const incomeWorld = income.querySelector('.income-glass-world');
  const fallbackWorld = income.querySelector('.income-glass-fallback-world');
  const incomeStage = income.querySelector('.income-glass-stage');
  const incomeTitle = income.querySelector('.income-glass-title');
  const incomeRank = income.querySelector('.income-glass-rank');
  const cap = income.querySelector('.income-glass-cap');
  const fallbackNumber = income.querySelector('.income-glass-fallback-number');
  const fallbackCaption = income.querySelector('.income-glass-fallback-caption');
  const fallbackMeasure = document.createElement('canvas').getContext('2d');
  fallbackMeasure.font = '700px Agse';
  fallbackNumber.style.fontSize = `${700 * Math.min(1, 1200 / fallbackMeasure.measureText('8'.repeat(income.dataset.value.length)).width)}px`;
  const thanksScene = thanks.querySelector('.thanks-scene');
  const heart = thanks.querySelector('.thanks-heart-motion');
  const heartEntrance = thanks.querySelector('.thanks-heart-entrance');
  const burst = thanks.querySelector('.thanks-burst');
  const burstMotion = thanks.querySelector('.thanks-burst-motion');
  const thanksStats = [...thanks.querySelectorAll('.thanks-stat')];
  const thanksNote = thanks.querySelector('.thanks-note');
  const thanksTitle = thanks.querySelector('.thanks-title');
  const glow = story.querySelector('.story-heart-glow');
  const thanksNotes = createThanksNotes(thanks);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = { x: 0, y: 0 };
  let geometry, width, height, top, heroScale, personalScale, heartCenter;
  let frame = 0, previousTime = 0, current = null, heroActive = null, intersecting = true;
  let forceDraw = true;
  const lastVisibility = new WeakMap();
  function panel(key, opacity, dominant) {
    const el = panels[key];
    if (!el) return;
    el.style.opacity = opacity;
    el.style.visibility = opacity > .001 ? 'visible' : 'hidden';
    // Скрытая сцена на телефоне не держит ни слоёв, ни раскладки (content-visibility).
    el.classList.toggle('is-panel-off', opacity <= .001);
    // Маска краёв видео конверта нужна только на время перехода из «Спасибок»:
    // постоянная маска на видео в Safari заставляет рисовать его программно.
    if (key === 'postcards') el.classList.toggle('is-crossfading', opacity > .001 && opacity < .999);
    const visible = key === dominant;
    if (lastVisibility.get(el) !== visible) {
      lastVisibility.set(el, visible);
      el.inert = !visible;
      el.setAttribute('aria-hidden', String(!visible));
    }
  }
  const lastDepth = new WeakMap();
  function applyDepth(u) {
    // Размытие панели — только на мощных устройствах и не для сцен с видео или
    // backdrop-filter внутри (открытки, моменты): там оно пересчитывается каждый кадр.
    const depth = sceneDepth(u), heavyOk = getQuality() === 'full';
    for (const [key, d] of Object.entries(depth)) {
      const el = panels[key];
      if (!el) continue;
      const still = reduced.matches || el.style.visibility === 'hidden' || (Math.abs(d.scale - 1) < .0005 && d.blur < .05);
      const transform = still ? '' : `translate3d(0, ${d.lift.toFixed(3)}%, 0) scale(${d.scale.toFixed(4)})`;
      const light = key === 'moments' || key === 'postcards';   // только масштаб, без фильтров
      // На телефоне без фильтров вообще: brightness() на сцене с WebGL-шаром или
      // видео заставлял iOS Safari рисовать всю сцену программно и ронял вкладку.
      const filter = still || light || d.blur < .05 || getQuality() === 'lite' ? '' : heavyOk ? `blur(${d.blur.toFixed(2)}px) brightness(${d.dim.toFixed(3)})` : `brightness(${d.dim.toFixed(3)})`;
      const sig = transform + '|' + filter + '|' + el.style.visibility;
      if (lastDepth.get(el) === sig) continue;
      lastDepth.set(el, sig);
      el.style.transform = transform; el.style.filter = filter;
      // Слой держим всё время, пока панель видна: включение/выключение will-change
      // посреди сцены заставляло заново растеризовать её (провалы по ~100 мс).
      el.style.willChange = el.style.visibility === 'hidden' ? '' : 'transform';
    }
  }
  // When the pinned story releases, it recedes like a card under the next chapter
  // instead of simply scrolling away.
  let lastRelease = -1;
  function applyRelease() {
    const raw = (scrollY - top) / Math.max(1, height) - storyTravel;
    const r = reduced.matches ? 0 : Math.max(0, Math.min(1, raw));
    if (Math.abs(r - lastRelease) < .001) return;
    lastRelease = r;
    const e = r * r * (3 - 2 * r);
    pin.style.transform = r ? `translate3d(0, ${(e * 38).toFixed(2)}%, 0) scale(${(1 - e * .1).toFixed(4)})` : '';
    pin.style.filter = r && getQuality() !== 'lite' ? `brightness(${(1 - e * .7).toFixed(3)})` : '';
    // Телефон: то же затемнение чёрным слоем поверх (::after), без фильтра.
    pin.style.setProperty('--release-dim', getQuality() === 'lite' && r ? (e * .7).toFixed(3) : '0');
    pin.style.borderRadius = r ? `${(e * 48).toFixed(1)}px` : '';
  }
  function fit() {
    width = pin.clientWidth; height = pin.clientHeight;
    top = story.getBoundingClientRect().top + scrollY;
    heroScale = hero.classList.contains('hero-film') ? fitScale(width, height, 1920, heroHeight, 'hero') : fitScale(width, height, 1920, heroHeight, 'hero', 24, 24);
    if (hero.classList.contains('hero-film')) {
      hero.style.setProperty('--film-viewport-width', `${width / heroScale}px`);
      hero.style.setProperty('--film-viewport-height', `${height / heroScale}px`);
    }
    personalScale = fitScale(width, height, 1920, personalHeight, 'personal', 24, 28);
    fallbackMeasure.font = '700 250px Nauryz';
    name.style.setProperty('--name-size', `${250 * Math.min(1, 1011 / Math.max(1, fallbackMeasure.measureText(name.textContent).width))}px`);
    fallbackMeasure.font = '700px Agse';
    counter.style.setProperty('--counter-size', `${700 * Math.min(1, 820 / Math.max(1, fallbackMeasure.measureText(counter.dataset.value).width))}px`);
    geometry = incomeGlassGeometry(width, height);
    incomeStage.style.setProperty('--glass-scale', geometry.scale);
    incomeTitle.style.fontSize = '260px';
    const titleWidth = Math.max(1890, incomeTitle.scrollWidth);
    incomeTitle.style.fontSize = `${260 * Math.min(1, 1890 / titleWidth)}px`;
    getIncomeGlassRenderer(income)?.resize(width, height);
    const thanksScale = fitScale(thanksScene.clientWidth, thanksScene.clientHeight, 1920, 1478, 'thanks', 24, 20);
    setHeadingScale(heroCamera,heroScale,width,height);setHeadingScale(personalCamera,personalScale,width,height);setHeadingScale(incomeStage,geometry.scale,width,height);setHeadingScale(thanksScene,thanksScale,width,height);
    thanksScene.style.setProperty('--thanks-scale', thanksScale);
    thanksNotes?.resize(thanksScale, thanksScene.clientWidth, thanksScene.clientHeight);
    const heartBox = screenRect(heart);
    const pinBox = pin.getBoundingClientRect();
    heartCenter = { x: heartBox.x + heartBox.width / 2 - pinBox.x, y: heartBox.y + heartBox.height / 2 - pinBox.y };
    glow.style.left = `${heartCenter.x}px`; glow.style.top = `${heartCenter.y}px`;
    forceDraw = true; schedule();
  }
  function draw(now) {
    frame = 0;
    if (signal.aborted || document.hidden) return;
    const target = storyUnit(scrollY, top, height);
    if (!intersecting && !forceDraw) return;
    const dt = Math.min(64, Math.max(1, now - (previousTime || now - 16)));
    previousTime = now;
    if (current === null || reduced.matches || forceDraw || Math.abs(target - current) < .0003) current = target;
    else current += (target - current) * (1 - Math.exp(-dt / (target>10.85?145:75)));
    forceDraw = false;
    const f = openingStoryFrame(current, reduced.matches);
    const dominant = current < .78 ? 'hero' : current < 2.4 ? 'personal' : current < 3.87 ? 'thanks' : current < 5.98 ? 'postcards' : current < 7.86 ? 'moments' : current < 10.5 ? 'income' : current<16.15?'planet':'contact';
    story.dataset.storyUnit = current.toFixed(4); story.dataset.activeScene = dominant;
    if (document.documentElement.dataset.scene !== dominant) document.documentElement.dataset.scene = dominant;
    panel('hero', f.hero, dominant); panel('personal', f.personal, dominant);
    panel('planet', f.planet, dominant);
    planetMotion?.draw(current, f.planet > .001 && intersecting, reduced.matches);
    panels.planet.style.transform='none';
    panel('contact',f.contact,dominant);contactMotion?.draw(f.contactProgress,f.contact>.001&&intersecting,reduced.matches,current);
    panel('income', f.income, dominant); panel('thanks', f.thanks, dominant);
    panel('postcards', f.postcards, dominant); panel('moments', f.moments, dominant);
    applyDepth(current);
    applyRelease();
    envelopeMotion?.draw(f.postcardsProgress, f.postcards > .001 && intersecting);
    momentsMotion?.draw(f.momentsProgress, f.moments > .001 && intersecting);
    pin.style.setProperty('--story-dark', f.dark);
    const activeHero = f.hero > .03 && intersecting;
    hero.dataset.storyActive = String(activeHero);
    hero.classList.toggle('is-hero-active', activeHero);
    if (heroActive !== activeHero) { heroActive = activeHero; hero.dispatchEvent(new Event('story:hero-visibility')); }
    const move = reduced.matches ? 0 : f.heroDecor;
    if(f.hero>.001){
    placeComposition(heroCamera, heroScale, ` scale(${f.heroScale})`);   // телефон: базовый масштаб через zoom (память), анимация — transform
    if (heroStamp) heroStamp.style.opacity = 1 - move;
    if (heroSubtitle) heroSubtitle.style.opacity = 1 - move;
    heroTitle.style.opacity = 1 - move;
    // Keep the footage covering the viewport while the copy camera pulls back.
    heroSequence.style.transform = `scale(${hero.classList.contains('hero-film') ? f.heroFilmScale : 1 - move * .12})`;
    heroDecor.forEach((el, i) => {
      const sign = i % 2 ? 1 : -1;
      el.style.transform = `translate(${sign * move * 450}px, ${sign * move * 160}px) rotate(${sign * move * 18}deg)`;
      el.style.opacity = 1 - move;
    });
    }
    if(f.personal>.001){
    placeComposition(personalCamera, personalScale, ` scale(${f.personalScale})`);   // телефон: базовый масштаб через zoom (память), анимация — transform
    photo.style.opacity = f.personalPhoto;
    photo.style.transform = reduced.matches ? 'none' : `scale(${.86 + .14 * f.personalPhoto}) rotate(${(1 - f.personalPhoto) * -5}deg)`;
    name.style.opacity = f.personalName;
    count.style.opacity = f.personalCount;
    caption.style.opacity = f.personalCaption;
    const personalDigits = storyDigits(counter.dataset.value, current, 1.1, 1.72);
    personalSlots.forEach((slot, i) => { slot.textContent = reduced.matches ? counter.dataset.value[i] : personalDigits[i]; });
    }
    getIncomeGlassRenderer(income)?.setVisible(f.income>.001 && intersecting);
    if (f.income > .001) {
      const pose = incomeGlassPose(f.incomeProgress, reduced.matches);
      const info = 1 - storyPhase(current, 10.05, 10.45);
      const handoff = incomePlanetHandoff(width, height, current);
      pose.zoom = current >= 10.05 ? handoff.radius / geometry.radius : pose.zoom;
      pose.number *= info; pose.caption *= info;
      const centerX = width / 2 + (geometry.x - width / 2) / Math.max(1, incomeGlassPose(f.incomeProgress).zoom);
      const centerY = height / 2 + (geometry.y - height / 2) / Math.max(1, incomeGlassPose(f.incomeProgress).zoom);
      pose.centerX = current >= 10.05 ? handoff.x : centerX;
      pose.centerY = current >= 10.05 ? handoff.y : centerY;
      const dx = (pose.centerX - geometry.x) / geometry.scale;
      const dy = (pose.centerY - geometry.y) / geometry.scale;
      incomeWorld.style.transform = `translate(${dx}px, ${dy}px) scale(${pose.zoom})`;
      fallbackWorld.style.transform = incomeWorld.style.transform;
      incomeViewport.style.setProperty('--income-orb', 1);
      incomeViewport.style.setProperty('--income-paper', 1);
      cap.style.opacity = pose.cap * info;
      incomeTitle.style.opacity = pose.title * info;
      incomeTitle.style.transform = `scale(${reduced.matches ? 1 : .94 + .06 * pose.title})`;
      incomeRank.style.opacity = pose.rank * info;
      const digits = incomeGlassDigits(income.dataset.value, reduced.matches ? 1 : f.incomeProgress);
      fallbackNumber.textContent = digits;
      fallbackNumber.style.opacity = pose.number;
      fallbackCaption.style.opacity = pose.caption;
      income.dataset.progress = f.incomeProgress.toFixed(4); income.dataset.digits = digits;
      getIncomeGlassRenderer(income)?.draw(pose, geometry, digits, width, height);
      syncIncomeCapWindow(income);
    }
    thanks.classList.toggle('is-active', f.thanks > .75 && intersecting);
    thanks.classList.toggle('is-revealed', f.heart > 0);
    if(f.thanks>.001){
    heartEntrance.style.opacity = f.heart;
    heartEntrance.style.transform = reduced.matches ? 'none' : `scale(${(.12 + .88 * f.heart) * (1 - f.thanksExit * .12)}) rotate(${(1 - f.heart) * -13}deg)`;
    heart.style.transform = reduced.matches ? 'none' : `translate(${pointer.x * 10}px, ${pointer.y * 7}px)`;
    burst.style.opacity = f.heart;
    burst.style.transform = `scale(${reduced.matches ? 1 : .65 + .35 * f.heart})`;
    burstMotion.style.transform = reduced.matches ? 'none' : `rotate(${(1 - f.heart) * 7}deg)`;
    burstMotion.style.translate = reduced.matches ? 'none' : `${pointer.x * -44}px ${pointer.y * -32}px`;
    thanksStats.forEach((stat, index) => {
      const reveal = storyPhase(current, 2.48 + index * .09, 2.95 + index * .09);
      stat.style.opacity = reveal;
      stat.style.transform = reduced.matches ? 'none' : `translateX(${(index ? 1 : -1) * (1 - reveal) * 150}px) scale(${.9 + .1 * reveal})`;
      const el = stat.querySelector('.thanks-digits');
      const digits = storyDigits(el.dataset.value, current, 2.5 + index * .1, 3.05 + index * .1);
      [...el.children].forEach((slot, i) => { slot.textContent = reduced.matches ? el.dataset.value[i] : digits[i]; });
    });
    const titleReveal = storyPhase(current, 2.4, 2.8);
    thanksTitle.style.opacity = titleReveal;
    thanksTitle.style.transform = reduced.matches ? 'none' : `translateY(${(1 - titleReveal) * 32}px)`;
    thanksNote.style.opacity = f.thanksNote;
    thanksNote.style.transform = 'none';
    thanksNotes?.draw(reduced.matches ? 4 : current);
    }
    glow.style.opacity = reduced.matches || f.thanks<=.001 ? 0 : Math.sin(f.heart * Math.PI) * .35;
    glow.style.transform = `translate(-50%, -50%) scale(${.7 + f.incomeExit * .7})`;
    if (Math.abs(target - current) > .0003) schedule();
  }
  function schedule() { if (!frame && (intersecting || forceDraw) && !signal.aborted && !document.hidden) frame = requestAnimationFrame(draw); }
  const observer = new IntersectionObserver(entries => {
    intersecting = entries[0].isIntersecting;
    if (!intersecting) current = null;
    forceDraw = true; schedule();
  });
  observer.observe(story);
  const resize = new ResizeObserver(fit); resize.observe(pin);
  window.addEventListener('scroll', schedule, { passive: true, signal });
  window.addEventListener('resize', fit, { passive: true, signal });
  window.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || !intersecting) return;
    pointer.x = event.clientX / Math.max(1, width) - .5;
    pointer.y = event.clientY / Math.max(1, height) - .5;
    if (current > 2.1 && current < 4.1) schedule();
  }, { passive: true, signal });
  document.addEventListener('visibilitychange', () => { previousTime = 0; schedule(); }, { signal });
  reduced.addEventListener('change', () => { forceDraw = true; schedule(); }, { signal });
  function toAnchor(hash, behavior = 'instant') {
    if (!(hash in storyAnchors)) return false;
    window.scrollTo({ top: top + storyAnchors[hash] * height, behavior });
    return true;
  }
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href^="#"]');
    const hash = link?.getAttribute('href');
    if (!hash || !(hash in storyAnchors)) return;
    event.preventDefault(); history.pushState(null, '', hash); toAnchor(hash, reduced.matches ? 'instant' : 'smooth');
  }, { signal });
  window.addEventListener('hashchange', () => toAnchor(location.hash), { signal });
  signal.addEventListener('abort', () => { observer.disconnect(); resize.disconnect(); cancelAnimationFrame(frame); }, { once: true });
  fit();
  return { toAnchor };
}
