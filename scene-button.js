import { storyAnchors } from './opening-story-layout.js';
import { bookChapterPlan } from './learning-layout.js';

function sceneStops(root) {
  const stops = [0];
  const y = el => el.getBoundingClientRect().top + scrollY;
  const story = root.querySelector('.opening-story');
  if (story) {
    const height = story.querySelector('.story-pin').clientHeight;
    for (const [selector, unit] of Object.entries(storyAnchors)) {
      if (story.querySelector(selector)) stops.push(y(story) + unit * height);
    }
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  for (const el of root.querySelectorAll('section[id],.book-chapter,.ending-chapter')) {
    if (el.closest('.opening-story') || !el.getClientRects().length) continue;
    if (el.matches('.book-chapter')) {
      const h = el.querySelector('.book-chapter-stage').clientHeight;
      const spending = el.classList.contains('has-spending');
      if (spending) stops.push(y(el) + (reduced ? 0 : 1.17) * h);
      stops.push(y(el) + (reduced ? Number(spending) : bookChapterPlan(spending).offset + 2.42) * h);
    } else if (el.matches('.ending-chapter')) {
      const h = el.querySelector('.ending-chapter-pin').clientHeight;
      stops.push(y(el) + (reduced ? 0 : .59) * h, y(el) + el.offsetHeight - h);
    } else if (!el.closest('.book-chapter,.ending-chapter')) {
      const h = el.querySelector('[class$="-stage"]')?.clientHeight || innerHeight;
      const travel = Math.max(0, el.offsetHeight - h);
      stops.push(y(el) + (el.id === 'achievements' ? Math.min(.55 * h, travel) : travel * .96));
    }
  }
  const end = document.documentElement.scrollHeight - innerHeight;
  return stops.map(v => Math.round(Math.max(0, Math.min(end, v)))).sort((a,b) => a-b);
}

export function mountSceneButton(root, signal) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'scene-next';
  button.textContent = 'Дальше ↓';
  button.setAttribute('aria-label','Перейти к следующей сцене');
  document.body.append(button);
  let frame = 0;
  let stops = sceneStops(root);
  function sync() { button.hidden = scrollY >= stops[stops.length - 1] - 3; }
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    button.removeAttribute('aria-disabled');
    sync();
  }
  function refresh() { stop(); stops = sceneStops(root); sync(); }
  function play(direction = 1) {
    if (frame) return;
    stops = sceneStops(root);
    const from = scrollY;
    const to = direction > 0 ? stops.find(pos => pos > from + 3) : stops.slice().reverse().find(pos => pos < from - 3);
    if (to === undefined) return sync();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.scrollTo({top:to, behavior:'instant'});
      return sync();
    }
    const start = performance.now();
    const duration = Math.min(3500, Math.max(1300, Math.abs(to-from)/innerHeight*1250));
    button.setAttribute('aria-disabled','true');
    function tick(now) {
      const t = Math.min(1,(now-start)/duration);
      window.scrollTo({top:from+(to-from)*t*t*(3-2*t), behavior:'instant'});
      if (t < 1) frame = requestAnimationFrame(tick);
      else stop();
    }
    frame = requestAnimationFrame(tick);
  }
  button.addEventListener('click',() => play(),{signal});
  root.classList.add('swipe-scenes');
  let gesture;
  root.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch') return;
    if (!event.isPrimary || frame || event.target.closest('button,a,input,textarea,select,[role="dialog"]') ||
        (window.visualViewport?.scale || 1) > 1.01) {
      gesture = null;
      return;
    }
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY };
  }, {signal});
  function finishSwipe(event) {
    if (gesture?.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    if (Math.abs(dy) >= 38 && Math.abs(dy) > Math.abs(dx) * 1.3) {
      gesture = null;
      play(dy < 0 ? 1 : -1);
    }
  }
  root.addEventListener('pointermove',finishSwipe,{signal});
  root.addEventListener('pointerup',event => { finishSwipe(event); gesture = null; },{signal});
  root.addEventListener('pointercancel',() => { gesture = null; },{signal});
  for (const event of ['wheel','keydown']) {
    window.addEventListener(event,e => { if (frame && e.target !== button) stop(); },{signal,passive:true});
  }
  window.addEventListener('scroll',sync,{signal,passive:true});
  // A collapsing browser toolbar must not interrupt a running step.
  const size = new ResizeObserver(refresh);
  size.observe(root);
  signal.addEventListener('abort',()=>{stop();size.disconnect();root.classList.remove('swipe-scenes');button.remove();},{once:true});
  sync();
}
