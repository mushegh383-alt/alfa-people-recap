import { storyAnchors } from './opening-story-layout.js?local=18';
import { bookChapterPlan } from './learning-layout.js';

function sceneStops(root) {
  const stops = [{id:'intro', y:0}];
  const y = el => el.getBoundingClientRect().top + scrollY;
  const story = root.querySelector('.opening-story');
  if (story) {
    const rate = Number(getComputedStyle(story).getPropertyValue('--opening-scroll-rate')) || 1;
    const height = story.querySelector('.story-pin').clientHeight * rate;
    for (const [selector, unit] of Object.entries(storyAnchors)) {
      if (story.querySelector(selector)) stops.push({id:selector.slice(1), y:y(story) + unit * height});
    }
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
  hint.innerHTML = '<span class="scroll-hint-text">Прокручивайте вниз без остановок</span><span class="scroll-hint-line" aria-hidden="true"><i></i></span>';
  root.append(hint);

  function refresh() {
    root.classList.toggle('mobile-scroll', phone.matches);
    const showHint = phone.matches && scrollY < 16;
    hint.classList.toggle('is-visible', showHint);
    hint.setAttribute('aria-hidden', String(!showHint));
  }
  refresh();
  phone.addEventListener('change', refresh, {signal});
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
