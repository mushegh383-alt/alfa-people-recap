import { ROUND as R, ATTEMPTS_PER_DAY, POSTCARDS, STAMPS, STORAGE_KEY, RECAP_URL, asset } from './config.js';
import { createRound, restoreRound, serializeRound, step, snapshot, stampWord } from './engine.js';
import { loadImages, createRenderer } from './renderer.js';
import { drawPostcard, toBlob, thumbnail } from './postcard.js';
import * as store from './storage.js';

const $ = (sel, root = document) => root.querySelector(sel);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>';
const icons = {
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>',
  sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5ZM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/></svg>',
  mute: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5ZM16 9l6 6m0-6-6 6"/></svg>',
};

const root = $('#root');
root.innerHTML = `
<div class="game-app">
  <aside class="intro-panel">
    <a class="back-link" href="${RECAP_URL}">${arrow}<span>К итогам года</span></a>
    <div class="intro-body">
      <p class="eyebrow">Новогодняя игра</p>
      <h1 class="intro-title">почта<br><span>чудес</span></h1>
      <p class="intro-lead">Собирайте марки и открывайте пять эксклюзивных открыток к Новому году</p>
      <ul class="rules">
        <li><span class="rule-art stamp-mini" style="--frame:url('${asset(STAMPS[1].frame)}')"><img src="${asset(STAMPS[1].image)}" alt=""></span><span>Марка</span><b>+1</b></li>
        <li><span class="rule-art stamp-mini is-express" style="--frame:url('${asset(STAMPS[2].frame)}')"><img src="${asset(STAMPS[2].image)}" alt=""></span><span>Супермарка</span><b>+3</b></li>
        <li><span class="rule-art is-blot"><img src="${asset('blot.webp')}" alt=""></span><span>Клякса</span><b class="is-minus">−5</b></li>
      </ul>
    </div>
    <div class="attempts-block">
      <p class="eyebrow">Попытки на сегодня</p>
      <div class="attempt-dots" data-attempts></div>
      <p class="attempts-caption" data-attempts-caption></p>
    </div>
  </aside>

  <main class="stage-wrap">
    <div class="game-stage" tabindex="-1" aria-label="Игровое поле. Управляйте пипликом мышью, пальцем или стрелками.">
      <img class="scenery" src="${asset('scenery.webp')}" alt="" draggable="false">
      <canvas class="game-canvas" aria-hidden="true"></canvas>
      <div class="hud">
        <div class="score-badge"><b data-score>0</b><span data-score-label>Марки на счёте</span><i data-round hidden>+0 за раунд</i></div>
        <div class="hud-right">
          <div class="timer"><i></i><span data-timer>01:00</span></div>
          <button class="icon-button" data-action="sound" aria-label="Включить звук" aria-pressed="false">${icons.mute}</button>
          <button class="icon-button" data-action="pause" aria-label="Пауза" hidden>${icons.pause}</button>
        </div>
      </div>
      <div class="play-layer" hidden>
        <div class="level-label"><span data-level>1 / 5</span><b data-level-name>Ловите марки</b></div>
        <p class="wind-label" data-wind hidden></p>
        <div class="mechanic-toast" data-toast hidden role="status"><b></b><span></span></div>
        <p class="catch-feedback" data-feedback aria-live="polite"></p>
        <div class="time-track" role="progressbar" aria-label="Оставшееся время" aria-valuemin="0" aria-valuemax="${R.duration}"><span data-time-track></span></div>
      </div>
      <div class="screen-overlay" data-overlay></div>
      <div class="countdown-overlay" data-countdown hidden aria-live="assertive"><p></p><strong></strong><span>Водите влево-вправо, чтобы поймать</span></div>
      <p class="sr-only" role="status" data-sr></p>
    </div>
  </main>

  <aside class="collection-panel">
    <div class="collection-head"><p class="eyebrow">Моя коллекция</p><b data-collection-count>0/5</b></div>
    <div class="collection-grid" data-collection></div>
    <div data-side-progress></div>
  </aside>
</div>`;

const stage = $('.game-stage'), canvas = $('.game-canvas'), overlay = $('[data-overlay]');
const hud = {
  score: $('[data-score]'), scoreLabel: $('[data-score-label]'), round: $('[data-round]'), timer: $('[data-timer]'),
  pause: $('[data-action="pause"]'), sound: $('[data-action="sound"]'),
  play: $('.play-layer'), level: $('[data-level]'), levelName: $('[data-level-name]'), wind: $('[data-wind]'),
  toast: $('[data-toast]'), feedback: $('[data-feedback]'), track: $('[data-time-track]'), sr: $('[data-sr]'),
  countdown: $('[data-countdown]'),
};

let mode = 'loading';            // loading | error | start | countdown | playing | paused | settling | save-error | result | limit | album
let images = null, renderer = null;
let round = createRound(), activeId = null;
let resumed = false, confirmRestart = false, busy = false, sound = false, audio = null;
let lastScore = 0, freshCards = [], albumReturn = 'start', albumCard = null, errorText = '';
const keys = new Set();
let keyboardUser = false;
window.addEventListener('keydown', e => { if (e.key === 'Tab' || e.key === 'Enter' || e.key === 'Escape') keyboardUser = true; }, true);
window.addEventListener('pointerdown', () => { keyboardUser = false; }, true);
const cards = new Map();          // id → Promise<{ canvas, thumb, full }>
const thumbUrls = new Map();
let progress = safeLoad();

function safeLoad() { try { return store.load(); } catch (e) { errorText = e.message; return store.load({ getItem: () => null }); } }

// ── Открытки ─────────────────────────────────────────────
async function ensureCard(card) {
  if (cards.has(card.id)) return cards.get(card.id);
  const entry = (async () => {
    const c = await drawPostcard(card, images);
    const thumb = await thumbnail(c);
    thumbUrls.set(card.id, thumb);
    let full = null;   // PNG для скачивания собираем только когда открытку открыли
    return { canvas: c, thumb, get full() { return full ??= toBlob(c).then(b => URL.createObjectURL(b)); } };
  })();
  cards.set(card.id, entry);
  return entry;
}

function thumbHTML(card, interactive = true) {
  const open = progress.bank >= card.threshold;
  const tag = interactive ? 'button' : 'div';
  const label = open ? `Открыть открытку «${card.name}»` : `Открытка «${card.name}»: нужно ${card.threshold} ${stampWord(card.threshold)}`;
  return `<${tag} class="postcard-thumb ${open ? 'is-open' : 'is-locked'}" ${interactive ? `data-action="card" data-card="${card.id}" aria-label="${label}"` : ''} style="--card-bg:${card.bg};--card-ink:${card.ink}">
    <span class="postcard-face" data-thumb="${card.id}">${open ? (thumbUrls.has(card.id) ? `<img src="${thumbUrls.get(card.id)}" alt="">` : '') : `<span class="lock-mark">?</span>`}</span>
    <span class="postcard-caption">${open ? card.name : `${card.threshold} ${stampWord(card.threshold)}`}</span>
  </${tag}>`;
}

async function fillThumbs(scope = document) {
  for (const el of scope.querySelectorAll('.postcard-thumb.is-open [data-thumb]')) {
    const card = POSTCARDS.find(c => c.id === el.dataset.thumb);
    const { thumb } = await ensureCard(card);
    if (!el.querySelector('img')) el.innerHTML = `<img src="${thumb}" alt="">`;
  }
}

function progressHTML(bank, target) {
  const next = target || store.nextCard(bank);
  const floor = target ? 0 : [...POSTCARDS].reverse().find(c => bank >= c.threshold)?.threshold || 0;
  const ratio = next ? Math.min(1, (bank - floor) / (next.threshold - floor)) : 1;
  const title = target || next ? 'Собрано марок' : 'Вся коллекция собрана';
  return `<div class="bank-progress">
    <div class="bank-row"><span>${title}</span><b>${bank}${next ? `<small> / ${next.threshold}</small>` : ''}</b></div>
    <div class="bank-track" role="progressbar" aria-label="Марки для открытки" aria-valuemin="${floor}" aria-valuemax="${next?.threshold || bank || 1}" aria-valuenow="${bank}"><span style="transform:scaleX(${ratio})"></span></div>
  </div>`;
}

// ── Боковые панели ───────────────────────────────────────
function untilMidnight() {
  const now = new Date(), next = new Date(now); next.setHours(24, 0, 0, 0);
  const min = Math.max(1, Math.ceil((next - now) / 60000)), h = Math.floor(min / 60), m = min % 60;
  return h ? `${h} ч ${m} мин` : `${m} мин`;
}

function renderSide() {
  const left = store.attemptsLeft(progress);
  $('[data-attempts]').innerHTML = Array.from({ length: ATTEMPTS_PER_DAY }, (_, i) => `<i class="${i < left ? 'is-left' : ''}"></i>`).join('');
  $('[data-attempts-caption]').textContent = left ? `Осталось ${left} из ${ATTEMPTS_PER_DAY}` : `Новые через ${untilMidnight()}`;
  const opened = store.unlocked(progress.bank).length;
  $('[data-collection-count]').textContent = `${opened}/${POSTCARDS.length}`;
  const grid = $('[data-collection]');
  grid.innerHTML = POSTCARDS.map(c => thumbHTML(c)).join('');
  $('[data-side-progress]').innerHTML = progressHTML(progress.bank);
  if (images) fillThumbs(grid);
}

// ── Экраны поверх поля ───────────────────────────────────
function attemptsLine() {
  const left = store.attemptsLeft(progress);
  return `<div class="overlay-attempts"><span class="attempt-dots">${Array.from({ length: ATTEMPTS_PER_DAY }, (_, i) => `<i class="${i < left ? 'is-left' : ''}"></i>`).join('')}</span>${left ? `Попытки на сегодня: ${left} из ${ATTEMPTS_PER_DAY}` : 'Попытки закончились'}</div>`;
}
const primary = (action, text, extra = '') => `<button class="primary-button" data-action="${action}" ${extra}>${text}${arrow}</button>`;
const textButton = (action, text, extra = '') => `<button class="text-button" data-action="${action}" ${extra}>${text}</button>`;
const opened = () => store.unlocked(progress.bank).length;

function overlayHTML() {
  const left = store.attemptsLeft(progress);
  switch (mode) {
    case 'loading': return `<section class="panel-card"><p class="kicker">Загрузка</p><h2>готовим<br>праздник</h2><p class="loading-number" data-load>0<small>%</small></p><div class="bank-track"><span data-load-bar style="transform:scaleX(0)"></span></div></section>`;
    case 'error': return `<section class="panel-card"><h2>попробуем<br>ещё раз?</h2><p>Не удалось загрузить игру.</p>${primary('reload', 'Повторить')}</section>`;
    case 'settling': return `<section class="panel-card"><h2>сохраняем<br>марки</h2><p>Почти готово…</p></section>`;
    case 'save-error': return `<section class="panel-card"><h2>сохраним<br>улов?</h2>${primary('settle', 'Повторить сохранение')}</section>`;
    case 'start': return `<section class="panel-card">
        <p class="kicker">${POSTCARDS.length} новогодних открыток</p>
        <h2>соберите<br><em>коллекцию</em></h2>
        <p>Ловите марки, уворачивайтесь от клякс и открывайте эксклюзивные открытки. На каждый раунд —&nbsp;60&nbsp;секунд</p>
        ${progressHTML(progress.bank)}
        ${primary('play', busy ? 'Готовим раунд…' : 'Играть', busy ? 'disabled' : '')}
        ${attemptsLine()}
        <div class="overlay-links">${textButton('album', `Моя коллекция · ${opened()}/${POSTCARDS.length}`)}<a class="text-button mobile-only" href="${RECAP_URL}">К итогам года</a></div>
      </section>`;
    case 'limit': return `<section class="panel-card">
        <p class="kicker">${ATTEMPTS_PER_DAY} из ${ATTEMPTS_PER_DAY} попыток</p>
        <h2>до<br><em>завтра!</em></h2>
        <p>Вы использовали все попытки на сегодня. Возвращайтесь через <b>${untilMidnight()}</b> — сможете сыграть снова.</p>
        <p class="saved-note">Ваш прогресс сохранён</p>
        ${progressHTML(progress.bank)}
        ${primary('album', 'Моя коллекция')}
        <div class="overlay-links">${activeId ? textButton('resume', 'Продолжить текущую попытку') : ''}<a class="text-button" href="${RECAP_URL}">К итогам года</a></div>
      </section>`;
    case 'paused': return `<section class="panel-card">
        <p class="kicker">Время остановлено</p>
        <h2>${confirmRestart ? 'новая<br>попытка?' : 'пауза'}</h2>
        <p>${confirmRestart ? 'Марки этого раунда не сохранятся, а попытка спишется.' : 'Продолжайте, когда будете готовы.'}</p>
        ${confirmRestart ? primary('restart', 'Начать заново', busy ? 'disabled' : '') : primary('resume', 'Продолжить', busy ? 'disabled' : '')}
        <div class="overlay-links">${confirmRestart ? textButton('cancel-restart', 'Отмена') : left ? textButton('ask-restart', 'Начать заново') : ''}${textButton('album', 'Открытки')}</div>
        ${attemptsLine()}
      </section>`;
    case 'result': {
      const gotCard = freshCards.length > 0;
      return `<section class="panel-card result-card">
        <p class="kicker">${gotCard ? `Новая открытка${freshCards.length > 1 ? ` ×${freshCards.length}` : ''}` : 'Игра завершена'}</p>
        <h2>${gotCard ? 'есть<br><em>открытка!</em>' : 'хорошая<br><em>работа!</em>'}</h2>
        <div class="result-score">+${lastScore}<span>${stampWord(lastScore)} за игру</span></div>
        ${gotCard ? `<div class="fresh-cards">${freshCards.map(c => thumbHTML(c)).join('')}</div>` : progressHTML(progress.bank)}
        ${left ? primary('play', 'Сыграть ещё раз', busy ? 'disabled' : '') : primary('to-limit', 'На сегодня всё')}
        ${attemptsLine()}
        <div class="overlay-links">${textButton('album', `Моя коллекция · ${opened()}/${POSTCARDS.length}`)}</div>
      </section>`;
    }
    case 'album': return albumCard ? cardViewHTML(albumCard) : `<section class="album-screen">
        <button class="album-back" data-action="album-back">← ${albumReturn === 'paused' ? 'К раунду' : 'Назад'}</button>
        <p class="kicker">Моя коллекция</p>
        <h2>открытки <span>${opened()}/${POSTCARDS.length}</span></h2>
        ${progressHTML(progress.bank)}
        <div class="album-grid">${POSTCARDS.map(c => thumbHTML(c)).join('')}</div>
        <p class="album-caption">Марки копятся после каждого раунда и не тратятся.</p>
      </section>`;
    default: return '';
  }
}

function cardViewHTML(card) {
  const open = progress.bank >= card.threshold, need = card.threshold - progress.bank;
  return `<section class="album-screen card-view">
    <button class="album-back" data-action="album-list">← В коллекцию</button>
    <h2 class="card-title">${card.name}</h2>
    ${open
      ? `<div class="postcard-large" data-large="${card.id}"><span class="postcard-loading">Готовим открытку…</span></div>
         <a class="primary-button" data-download download="alfa-people-${card.id}-2027.png" aria-disabled="true">Скачать открытку${arrow}</a>`
      : `<div class="postcard-large is-locked" style="--card-bg:${card.bg}"><span class="lock-mark">?</span></div>
         <p>Осталось собрать <b>${need} ${stampWord(need)}</b></p>
         ${progressHTML(progress.bank, card)}`}
  </section>`;
}

async function fillLarge() {
  const el = $('[data-large]', overlay);
  if (!el) return;
  const card = POSTCARDS.find(c => c.id === el.dataset.large);
  const full = await (await ensureCard(card)).full;
  if (!el.isConnected) return;
  el.innerHTML = `<img src="${full}" alt="Новогодняя открытка «${card.name}»">`;
  const link = $('[data-download]', overlay);
  link.href = full; link.removeAttribute('aria-disabled');
}

function render() {
  const playing = mode === 'playing' || mode === 'countdown';
  stage.classList.toggle('is-playing', mode === 'playing');
  stage.classList.toggle('is-dimmed', !playing && mode !== 'loading');
  stage.classList.toggle('is-album', mode === 'album');
  hud.pause.hidden = !(playing || mode === 'paused');
  hud.play.hidden = mode !== 'playing';
  hud.countdown.hidden = mode !== 'countdown';
  const html = overlayHTML();
  overlay.hidden = !html;
  overlay.className = `screen-overlay mode-${mode}`;
  overlay.innerHTML = html + (errorText ? `<p class="inline-error" role="alert">${errorText}</p>` : '');
  renderSide();
  if (images) { fillThumbs(overlay); fillLarge(); }
  // Фокус на кнопку переводим только тем, кто управляет с клавиатуры, — иначе у мыши/пальца висит рамка.
  if (!playing && mode !== 'loading' && keyboardUser) requestAnimationFrame(() => overlay.querySelector('button:not([disabled]), a[href]')?.focus({ preventScroll: true }));
}

function setMode(next) { mode = next; render(); }
function fail(e) { console.error(e); errorText = e.message || 'Не удалось сохранить прогресс. Попробуйте ещё раз.'; render(); }

// ── HUD ───────────────────────────────────────────────────
let lastHud = '';
function updateHud(force = false) {
  const v = snapshot(round);
  // На счету — все накопленные марки: банк + текущий раунд (пока раунд не сохранён).
  const inRound = Boolean(activeId), total = progress.bank + (inRound ? v.score : 0);
  const sig = `${total}|${inRound}|${v.score}|${v.remaining}|${v.level}|${v.feedback}|${v.wind.direction}|${v.wind.warning}|${v.notice?.id}`;
  if (!force && sig === lastHud) return;
  lastHud = sig;
  hud.score.textContent = total;
  hud.scoreLabel.textContent = 'Марки на счёте';
  hud.round.hidden = !inRound;
  hud.round.textContent = `+${v.score} за раунд`;
  hud.timer.textContent = `${String(Math.floor(v.remaining / 60)).padStart(2, '0')}:${String(v.remaining % 60).padStart(2, '0')}`;
  stage.classList.toggle('is-final-seconds', v.remaining <= 10 && (mode === 'playing' || mode === 'countdown' || mode === 'paused'));
  hud.level.textContent = `${v.level} / 5`; hud.levelName.textContent = v.label;
  hud.wind.hidden = v.wind.direction === 0;
  hud.wind.classList.toggle('is-warning', v.wind.warning);
  hud.wind.textContent = `${v.wind.direction > 0 ? '→' : '←'} ${v.wind.warning ? 'Сейчас подует' : 'Ветер'}`;
  hud.toast.hidden = !v.notice;
  if (v.notice && hud.toast.dataset.id !== v.notice.id) {
    hud.toast.dataset.id = v.notice.id;
    hud.toast.querySelector('b').textContent = v.notice.title;
    hud.toast.querySelector('span').textContent = v.notice.hint;
    hud.toast.style.animation = 'none'; void hud.toast.offsetWidth; hud.toast.style.animation = '';
  }
  hud.feedback.textContent = v.feedback;
  hud.track.parentElement.setAttribute('aria-valuenow', v.remaining);
  hud.sr.textContent = mode === 'playing' ? `Счёт: ${v.score} ${stampWord(v.score)}. ${v.label}.` : '';
}
function updateTrack() { hud.track.style.transform = `scaleX(${Math.max(0, 1 - round.elapsed / R.duration)})`; }

// ── Звук ─────────────────────────────────────────────────
function blip(bad) {
  if (!sound || !audio) return;
  try {
    const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime;
    o.type = bad ? 'triangle' : 'sine';
    o.frequency.setValueAtTime(bad ? 180 : 620, t); o.frequency.exponentialRampToValueAtTime(bad ? 65 : 1050, t + .11);
    g.gain.setValueAtTime(.045, t); g.gain.exponentialRampToValueAtTime(.001, t + .16);
    o.connect(g); g.connect(audio.destination); o.start(); o.stop(t + .17);
    o.onended = () => { o.disconnect(); g.disconnect(); };
  } catch {}
}
function toggleSound() {
  sound = !sound;
  hud.sound.innerHTML = sound ? icons.sound : icons.mute;
  hud.sound.setAttribute('aria-pressed', String(sound));
  hud.sound.setAttribute('aria-label', sound ? 'Выключить звук' : 'Включить звук');
  if (sound) {
    try { const Ctx = window.AudioContext || window.webkitAudioContext; if (Ctx && !audio) audio = new Ctx(); audio?.resume().then(() => blip(false)).catch(() => {}); } catch {}
  }
}

// ── Игровой цикл ─────────────────────────────────────────
let frame = 0, countdownTimer = 0;
function loop() {
  let last = 0, acc = 0, lastSaved = round.elapsed;
  const tick = now => {
    if (mode !== 'playing') return;
    if (!last) last = now;
    acc += Math.min((now - last) / 1000, .1); last = now;
    const caught = round.caught, hits = round.hits;
    const dir = (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0);
    while (acc >= 1 / 120 && !round.finished) { step(round, 1 / 120, dir); acc -= 1 / 120; }
    if (round.caught > caught || round.hits > hits) blip(round.hits > hits);
    renderer?.draw(round, reducedMotion.matches);
    updateHud(); updateTrack();
    if (round.finished) { keys.clear(); settle(); return; }
    if (round.elapsed - lastSaved >= 1) { lastSaved = round.elapsed; store.saveActive(activeId, serializeRound(round)).catch(e => { pause(); fail(e); }); }
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
}

function countdown() {
  clearInterval(countdownTimer);
  let n = 3;
  hud.countdown.querySelector('p').textContent = resumed ? 'Продолжаем' : 'Ловите марки';
  const show = () => { const s = hud.countdown.querySelector('strong'); s.textContent = n; s.style.animation = 'none'; void s.offsetWidth; s.style.animation = ''; };
  setMode('countdown'); show();
  countdownTimer = setInterval(() => {
    if (--n === 0) { clearInterval(countdownTimer); setMode('playing'); loop(); }
    else show();
  }, 700);
}

async function play(newAttempt = true) {
  if (busy) return;
  busy = true; errorText = ''; render();
  try {
    if (newAttempt) {
      const res = await store.beginAttempt();
      progress = res.state;
      if (!res.id) { busy = false; setMode('limit'); return; }
      activeId = res.id; round = createRound(); lastHud = '';
      renderer?.draw(round, false, true); updateHud(true); updateTrack();
      await store.saveActive(activeId, serializeRound(round));
    }
    keys.clear(); resumed = !newAttempt; confirmRestart = false; busy = false;
    audio?.resume().catch(() => {});
    countdown();
  } catch (e) { busy = false; fail(e); }
}

function pause() {
  if (mode !== 'playing' && mode !== 'countdown') return;
  cancelAnimationFrame(frame); clearInterval(countdownTimer); keys.clear();
  resumed = true; confirmRestart = false;
  setMode('paused');
  if (activeId) store.saveActive(activeId, serializeRound(round)).catch(fail);
}

async function settle() {
  if (busy) return;
  busy = true; errorText = ''; setMode('settling');
  try {
    const before = progress.bank;
    progress = await store.finishAttempt(activeId, round.score);
    lastScore = round.score;
    freshCards = POSTCARDS.filter(c => before < c.threshold && progress.bank >= c.threshold);
    activeId = null; busy = false;
    updateHud(true);
    setMode('result');
  } catch (e) { busy = false; setMode('save-error'); fail(e); }
}

function openAlbum(card = null) {
  if (['loading', 'error', 'settling', 'save-error'].includes(mode)) return;
  if (mode !== 'album') { albumReturn = mode === 'playing' || mode === 'countdown' ? 'paused' : mode; pause(); }
  albumCard = card; errorText = '';
  setMode('album');
}

// ── События ──────────────────────────────────────────────
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn || btn.disabled) return;
  const a = btn.dataset.action;
  if (a === 'play') play(true);
  else if (a === 'resume') play(false);
  else if (a === 'restart') play(true);
  else if (a === 'ask-restart') { confirmRestart = true; render(); }
  else if (a === 'cancel-restart') { confirmRestart = false; render(); }
  else if (a === 'pause') pause();
  else if (a === 'sound') toggleSound();
  else if (a === 'settle') settle();
  else if (a === 'to-limit') setMode('limit');
  else if (a === 'reload') boot();
  else if (a === 'album') openAlbum();
  else if (a === 'album-list') { albumCard = null; render(); }
  else if (a === 'album-back') { albumCard = null; setMode(albumReturn); }
  else if (a === 'card') openAlbum(POSTCARDS.find(c => c.id === btn.dataset.card));
});

function pointer(e) {
  if (e.target.closest('button, a') || !(mode === 'playing' || mode === 'countdown')) return;
  if (e.pointerType === 'touch' && e.type === 'pointermove' && !e.buttons) return;
  const box = stage.getBoundingClientRect();
  round.targetX = (e.clientX - box.left) / box.width * R.width;
  if (e.type === 'pointerdown') { stage.setPointerCapture(e.pointerId); stage.focus({ preventScroll: true }); }
}
stage.addEventListener('pointermove', pointer);
stage.addEventListener('pointerdown', pointer);

window.addEventListener('keydown', e => {
  if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(e.code) && mode === 'playing') { e.preventDefault(); keys.add(e.code); }
  if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) {
    if (mode === 'playing' || mode === 'countdown') pause();
    else if (mode === 'paused') play(false);
    else if (mode === 'album') { if (albumCard) { albumCard = null; render(); } else setMode(albumReturn); }
  }
});
window.addEventListener('keyup', e => keys.delete(e.code));
window.addEventListener('blur', () => { keys.clear(); pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); else refreshDay(); });
window.addEventListener('storage', e => { if (e.key === STORAGE_KEY) refreshDay(); });
setInterval(refreshDay, 30000);

function refreshDay() {
  if (!images) return;
  try {
    const before = JSON.stringify(progress);
    progress = store.load();
    if (mode === 'limit' && store.attemptsLeft(progress) > 0) setMode('start');
    else if (JSON.stringify(progress) !== before && ['start', 'limit', 'result', 'album'].includes(mode)) render();
    else if (mode === 'limit' || !store.attemptsLeft(progress)) renderSide();   // обновить таймер «до полуночи»
  } catch (e) { fail(e); }
}

new ResizeObserver(() => {
  if (!renderer) return;
  const box = stage.getBoundingClientRect();
  renderer.resize(box.width, box.height);
  renderer.draw(round, reducedMotion.matches, mode !== 'playing');
}).observe(stage);

// ── Запуск ───────────────────────────────────────────────
let bootController;
async function boot() {
  bootController?.abort();
  bootController = new AbortController();
  errorText = ''; setMode('loading');
  try {
    images = await loadImages(p => {
      const n = $('[data-load]', overlay), bar = $('[data-load-bar]', overlay);
      if (n) n.innerHTML = `${Math.round(p * 100)}<small>%</small>`;
      if (bar) bar.style.transform = `scaleX(${p})`;
    }, bootController.signal);
    renderer = createRenderer(canvas, images);
    const box = stage.getBoundingClientRect();
    renderer.resize(box.width, box.height);
    progress = store.load();
    if (progress.active) {
      activeId = progress.active.id;
      round = restoreRound(progress.active.game) || createRound();
      renderer.draw(round, false, true); updateHud(true); updateTrack();
      resumed = true;
      if (round.finished) settle(); else setMode('paused');
    } else {
      renderer.draw(round, false, true); updateHud(true); updateTrack();
      setMode(store.attemptsLeft(progress) ? 'start' : 'limit');
    }
  } catch (e) {
    if (bootController.signal.aborted && e === bootController.signal.reason) return;
    console.error(e); setMode('error');
  }
}
boot();
