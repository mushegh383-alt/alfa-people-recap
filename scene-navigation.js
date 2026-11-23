import { storyAnchors } from './opening-story-layout.js?local=18';
import { bookChapterPlan } from './learning-layout.js';
// Прокрутка идёт на тех же часах (60 Гц), что и отрисовка сцен: на 120-герцовом iPhone
// иначе каждый второй кадр сцена отставала от прокрутки — картинка «дрожала».
import { requestRenderFrame, cancelRenderFrame } from './performance.js';

export function sceneStops(root) {
  const stops = [{id:'intro', y:0}];
  const y = el => el.getBoundingClientRect().top + scrollY;
  const story = root.querySelector('.opening-story');
  if (story) {
    const rate = Number(getComputedStyle(story).getPropertyValue('--opening-scroll-rate')) || 1;
    const height = story.querySelector('.story-pin').clientHeight * rate;
    for (const [selector, unit] of Object.entries(storyAnchors)) {
      if (story.querySelector(selector)) stops.push({id:selector.slice(1), y:y(story) + unit * height});
    }
    // Конверт показывает два числа: сначала «получили», потом «отправили» — по остановке на каждое.
    if (story.querySelector('#postcards')) stops.push({id:'postcards-received', y:y(story) + 5.0 * height});
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  for (const el of root.querySelectorAll('section[id],.book-chapter,.ending-chapter')) {
    if (el.closest('.opening-story') || !el.getClientRects().length) continue;
    if (el.matches('.book-chapter')) {
      const h = el.querySelector('.book-chapter-stage').clientHeight;
      const spending = el.classList.contains('has-spending');
      if (spending) stops.push({id:'spending', y:y(el) + (reduced ? 0 : 1.17) * h});
      stops.push({id:'learning', y:y(el) + (reduced ? Number(spending) : bookChapterPlan(spending).offset + 2.42) * h});
    } else if (el.matches('.ending-chapter')) {
      const h = el.querySelector('.ending-chapter-pin').clientHeight;
      stops.push({id:'office', y:y(el) + (reduced ? 0 : .59) * h}, {id:'finale', y:y(el) + el.offsetHeight - h});
    } else if (!el.closest('.book-chapter,.ending-chapter')) {
      const h = el.querySelector('[class$="-stage"]')?.clientHeight || innerHeight;
      const travel = Math.max(0, el.offsetHeight - h);
      stops.push({id:el.id, y:y(el) + (el.id === 'achievements' ? Math.min(.55 * h, travel) : travel * .96)});
    }
  }
  const end = document.documentElement.scrollHeight - innerHeight;
  for (const stop of stops) stop.y = Math.round(Math.max(0, Math.min(end, stop.y)));
  return stops.sort((a,b) => a.y-b.y);
}

export function mountSceneNavigation(root, signal) {
  const params = new URLSearchParams(location.search);
  const preview = params.has('phone-preview');
  const phone = matchMedia(preview ? '(max-width: 767px)' : '(pointer: coarse) and (max-width: 767px), (pointer: coarse) and (max-height: 500px) and (max-width: 1000px)');
  const hint = document.createElement('div');
  hint.className = 'scroll-hint is-touch';
  hint.innerHTML = '<span class="scroll-hint-text">Листайте вверх — по одному экрану</span><span class="scroll-hint-line" aria-hidden="true"><i></i></span>';
  root.append(hint);

  function refresh() {
    root.classList.toggle('mobile-scroll', phone.matches);
    const showHint = phone.matches && scrollY < 16;
    hint.classList.toggle('is-visible', showHint);
    hint.setAttribute('aria-hidden', String(!showHint));
  }
  refresh();
  phone.addEventListener('change', refresh, {signal});
  // Телефон: один взмах — один слайд (выключить для сравнения: ?paging=0).
  if (params.get('paging') !== '0') mountPaging(root, signal, phone, hint);
  window.addEventListener('scroll', refresh, {passive:true, signal});

  let frame = 0;
  let timer = 0;
  const stop = () => {
    cancelAnimationFrame(frame);
    clearTimeout(timer);
  };
  const demo = params.get('demo');
  if (demo && (preview || demo === 'postcards')) {
    document.addEventListener('recap:ready', () => {
      const stops = sceneStops(root);
      const index = stops.findIndex(stop => stop.id === demo);
      if (index < 1) return;
      const from = stops[index - 1].y;
      const to = stops[index].y;
      scrollTo({top:from, behavior:'instant'});
      timer = setTimeout(() => {
        if (Math.abs(scrollY - from) > 4) return;
        const start = performance.now();
        const duration = (to - from) / innerHeight * 1300;
        function tick(now) {
          const t = Math.min(1, Math.max(0, now - start) / Math.max(1, duration));
          scrollTo({top:from + (to - from) * t, behavior:'instant'});
          if (t < 1) frame = requestAnimationFrame(tick);
        }
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) scrollTo({top:to, behavior:'instant'});
        else frame = requestAnimationFrame(tick);
      }, 900);
    }, {once:true, signal});
    for (const event of ['wheel', 'pointerdown', 'keydown']) {
      window.addEventListener(event, stop, {passive:true, signal});
    }
  }
  signal.addEventListener('abort', () => {
    stop();
    hint.remove();
    root.classList.remove('mobile-scroll');
  }, {once:true});
}

// ─── Листание по слайдам ────────────────────────────────────────────────────
// Нативная прокрутка на телефоне выключена: взмах вверх/вниз плавно (ease-in-out)
// проматывает страницу ровно до следующей остановки сцены. Все анимации сцен
// привязаны к прокрутке, поэтому они проигрываются целиком и одинаково плавно.
// Взмахи во время перехода копятся: два быстрых взмаха — через слайд.
function mountPaging(root, signal, phone, hint) {
  const html = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  // Сдвиг начинается сразу после взмаха и долго, мягко дотягивается до остановки
  // (ease-in-out на 6 с первую секунду почти стоял — ощущалось как лаг).
  const ease = t => 1 - Math.pow(1 - t, 3.2);
  let frame = 0, from = 0, to = 0, start = 0, duration = 0, target = -1, lockUntil = 0;
  let touch = null, wheelSum = 0, wheelTimer = 0;
  const speed = Number(new URLSearchParams(location.search).get('pace')) || 1;   // ?pace=0.5 — вдвое быстрее
  const enabled = () => phone.matches && root.classList.contains('is-ready') && !html.classList.contains('has-modal');

  function stops() {
    const min = innerHeight * .35, out = [];
    for (const stop of sceneStops(root)) if (!out.length || stop.y - out[out.length - 1].y > min) out.push(stop);
    return out;
  }
  function nearest(list) {
    let best = 0;
    for (let i = 1; i < list.length; i++) if (Math.abs(list[i].y - scrollY) < Math.abs(list[best].y - scrollY)) best = i;
    return best;
  }
  function tick(now) {
    const t = Math.min(1, (now - start) / Math.max(1, duration));
    scrollTo({top: from + (to - from) * ease(t), behavior: 'instant'});
    if (t < 1) frame = requestRenderFrame(tick);
    else { frame = 0; target = -1; armHint(); }
  }
  function go(dir) {
    if (!enabled()) return;
    const list = stops();
    const base = target >= 0 ? target : nearest(list);
    const next = Math.max(0, Math.min(list.length - 1, base + dir));
    if (next === base) return;
    target = next; from = scrollY; to = list[next].y; start = performance.now();
    const screens = Math.abs(to - from) / innerHeight;
    duration = reduced.matches ? 1 : Math.min(16800, 5200 + screens * 2880) * .75 * speed;
    hideHint();
    cancelRenderFrame(frame); frame = requestRenderFrame(tick);
  }
  // Подравнять к ближайшей остановке (поворот экрана, переход по якорю).
  function settle() {
    if (!enabled() || frame) return;
    const list = stops(), i = nearest(list);
    if (Math.abs(list[i].y - scrollY) > 4) { target = i; from = scrollY; to = list[i].y; start = performance.now(); duration = 450; frame = requestRenderFrame(tick); }
  }

  // Постояли на слайде 3 с — напоминаем, что дальше можно потянуть (кроме последнего).
  let hintTimer = 0;
  function hideHint() { clearTimeout(hintTimer); hint.classList.remove('is-visible'); hint.setAttribute('aria-hidden', 'true'); }
  function armHint() {
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => {
      if (!enabled() || frame) return;
      const list = stops();
      if (nearest(list) >= list.length - 1) return;
      hint.classList.add('is-visible'); hint.setAttribute('aria-hidden', 'false');
    }, 3000);
  }
  function apply() { root.classList.toggle('is-paging', phone.matches); html.classList.toggle('is-paging', phone.matches); }
  apply(); phone.addEventListener('change', apply, {signal});

  window.addEventListener('touchstart', e => {
    if (!enabled() || e.touches.length !== 1) { touch = null; return; }
    touch = {y: e.touches[0].clientY, x: e.touches[0].clientX, t: performance.now()};
  }, {passive: true, signal});
  window.addEventListener('touchmove', e => {
    if (!enabled() || !root.contains(e.target)) return;
    e.preventDefault();                                    // страница едет только по нашим взмахам
  }, {passive: false, signal});
  window.addEventListener('touchend', e => {
    if (!touch) return;
    const p = e.changedTouches[0], dy = touch.y - p.clientY, dx = touch.x - p.clientX, dt = performance.now() - touch.t;
    touch = null;
    if (Math.abs(dy) < Math.abs(dx)) return;
    if (Math.abs(dy) > 36 || (Math.abs(dy) > 14 && Math.abs(dy) / dt > .35)) go(dy > 0 ? 1 : -1);
    if (!frame) armHint();
  }, {passive: true, signal});
  window.addEventListener('wheel', e => {
    if (!enabled()) return;
    e.preventDefault();
    wheelSum += e.deltaY; clearTimeout(wheelTimer); wheelTimer = setTimeout(() => { wheelSum = 0; }, 180);
    if (Math.abs(wheelSum) > 40 && performance.now() > lockUntil) { go(wheelSum > 0 ? 1 : -1); wheelSum = 0; lockUntil = performance.now() + 450; }
  }, {passive: false, signal});
  window.addEventListener('keydown', e => {
    if (!enabled()) return;
    const down = ['ArrowDown', 'PageDown', ' '].includes(e.key), up = ['ArrowUp', 'PageUp'].includes(e.key);
    if (!down && !up) return;
    e.preventDefault(); go(down ? 1 : -1);
  }, {signal});
  let resizeTimer = 0;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(settle, 250); }, {signal});
  document.addEventListener('recap:ready', () => setTimeout(() => { settle(); armHint(); }, 400), {once: true, signal});
  window.addEventListener('touchstart', hideHint, {passive: true, signal});
  window.__recapPage = go;                                   // для проверок
  signal.addEventListener('abort', () => { cancelRenderFrame(frame); clearTimeout(hintTimer); root.classList.remove('is-paging'); html.classList.remove('is-paging'); delete window.__recapPage; }, {once: true});
}
