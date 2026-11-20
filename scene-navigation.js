import { storyAnchors } from './opening-story-layout.js?local=18';
import { bookChapterPlan } from './learning-layout.js';
import { filmTime } from './scroll-film-timing.js';

function sceneStops(root) {
  const stops = [{id:'intro', y:0}];
  const y = el => el.getBoundingClientRect().top + scrollY;
  const story = root.querySelector('.opening-story');
  if (story) {
    const height = story.querySelector('.story-pin').clientHeight;
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

// Allow time to trace the constellation, notice each gaze and watch the book open.
const sceneDuration = {spending:3500, postcards:2800, zodiac:5200, 'profile-views':6800, achievements:4900, learning:9400};

export function mountSceneNavigation(root, signal) {
  const preview = new URLSearchParams(location.search).has('phone-preview');
  const phone = matchMedia(preview ? '(max-width: 767px)' : '(pointer: coarse) and (max-width: 767px), (pointer: coarse) and (max-height: 500px) and (max-width: 1000px)');
  const curtain = document.createElement('div');
  curtain.className = 'chapter-curtain';
  curtain.setAttribute('aria-hidden','true');
  document.body.append(curtain);
  let frame = 0;
  let readUntil = 0;
  function landmarks(){
    const story=root.querySelector('.opening-story');
    const book=root.querySelector('.book-chapter');
    const ending=root.querySelector('.ending-chapter');
    const y=el=>el.getBoundingClientRect().top+scrollY;
    const h=story?.querySelector('.story-pin').clientHeight || innerHeight;
    const parts=[];
    if(story && story.querySelector('#talk-time'))parts.push(['clock',y(story)+storyAnchors['#talk-time']*h]);
    if(story && story.querySelector('#top-contact'))parts.push(['hours',y(story)+storyAnchors['#top-contact']*h]);
    for(const [id,name] of [['zodiac','zodiac'],['achievements','achievements'],['coins','coins']]){
      const el=root.querySelector('#'+id);
      if(el)parts.push([name,y(el)]);
    }
    if(book)parts.push(['book',y(book)]);
    if(ending)parts.push(['office',y(ending)]);
    return Object.fromEntries(parts);
  }
  let stops = sceneStops(root);
  let transition = null;
  const busy = () => Boolean(frame || transition);
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    curtain.style.opacity = '0';
    transition?.skipTransition();
    transition = null;
    delete document.documentElement.dataset.sceneDirection;
  }
  function refresh() {
    stops = sceneStops(root);
    root.classList.toggle('swipe-scenes', phone.matches);
    if (!phone.matches) stop();
  }
  phone.addEventListener('change',refresh,{signal});
  function play(direction = 1, demoPlayback = false) {
    if (busy() || (!phone.matches && !demoPlayback)) return;
    const from = scrollY;
    const next = direction > 0 ? stops.find(stop => stop.y > from + 3) : stops.slice().reverse().find(stop => stop.y < from - 3);
    if (!next) return;
    const to = next.y;
    const loc = landmarks();
    const forward = direction > 0;
    const boundaries = root.querySelector('#zodiac.overlap-entry') ? [] : [loc.zodiac];
    if (!root.querySelector('.book-chapter.has-spending.overlap-entry')) boundaries.push(loc.book);
    if (!root.querySelector('#coins.overlap-entry')) boundaries.push(loc.coins);
    if (!root.querySelector('.ending-chapter.overlap-entry')) boundaries.push(loc.office);
    const boundary = boundaries.find(y=>forward ? from<y && to>=y : from>=y && to<y);
    const atHours = position => [loc.clock, loc.hours].some(y => Math.abs(position-y)<4);
    const pause = forward ? Math.max(0, readUntil-performance.now()) : 0;
    readUntil = 0;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.scrollTo({top:to, behavior:'instant'});
      return;
    }
    // The artwork already eases on its own timeline. Cruise at a consistent
    // speed between short acceleration and braking ramps.
    const cut = boundary !== undefined;
    const entry = cut ? (forward ? Math.min(to,boundary+4) : Math.max(to, boundary-innerHeight*1.1)) : from;
    // Keep the outgoing artwork in place while the incoming scene is revealed.
    const reveal = cut && typeof document.startViewTransition === 'function';
    const fadeOut = reveal ? 0 : 180, fadeIn = 300;
    const distanceInScreens = Math.abs(to-entry)/innerHeight;
    const baseDuration = Math.min(3000, 1450 + 520*distanceInScreens);
    const travelTime = (forward && sceneDuration[next.id]) || baseDuration;
    let bookTrack;
    if (forward && next.id === 'learning') {
      const book = root.querySelector('.book-chapter');
      const h = book.querySelector('.book-chapter-stage').clientHeight;
      const offset = bookChapterPlan(book.classList.contains('has-spending')).offset;
      const firstPage = loc.book + (offset+.55)*h;
      const lastPage = loc.book + (offset+1.98)*h;
      if (entry < firstPage && lastPage < to) {
        bookTrack = [[0,entry],[.22,firstPage],[.84,lastPage],[1,to]];
      }
    }
    let elapsed = -pause;
    let previous;

    let captured = false;
    function tick(now) {
      if (previous !== undefined) elapsed += Math.min(40, now-previous);
      previous = now;
      if(elapsed<0){frame=requestAnimationFrame(tick);return;}
      if(reveal && !captured){
        captured = true;
        document.documentElement.dataset.sceneDirection = forward ? 'forward' : 'back';
        const capture = document.startViewTransition(()=>{
          if(signal.aborted || !phone.matches)return;
          window.scrollTo({top:entry,behavior:'instant'});
        });
        transition=capture;
        capture.ready.catch(()=>{}).then(()=>{
          if(transition!==capture || signal.aborted)return;
          previous=undefined;
          frame=requestAnimationFrame(tick);
        });
        capture.finished.catch(()=>{}).then(()=>{ if(transition===capture)transition=null; });
        return;
      }
      if(cut && !reveal && elapsed<fadeOut){
        curtain.style.opacity=String(elapsed/fadeOut);
        frame=requestAnimationFrame(tick);
        return;
      }
      const travel=elapsed-(cut?fadeOut:0);
      if(cut && !reveal)curtain.style.opacity=String(Math.max(0,1-travel/fadeIn));
      const t = Math.min(1, travel/travelTime);
      const ramp = .18;
      let distance = t - ramp/2;
      if (t < ramp) distance = t*t/(2*ramp);
      if (t > 1-ramp) distance = 1-ramp-(1-t)**2/(2*ramp);
      const position = bookTrack ? filmTime(bookTrack,t) : entry+(to-entry)*distance/(1-ramp);
      window.scrollTo({top:position, behavior:'instant'});
      if (t < 1) frame = requestAnimationFrame(tick);
      else {
        const readingTime = ({zodiac:4500, 'profile-views':4800, achievements:4400})[next.id] ?? (atHours(to) ? 3200 : 0);
        readUntil = performance.now() + readingTime;
        stop();
      }
    }
    frame = requestAnimationFrame(tick);
  }
  refresh();
  // Only the direct local demo link advances once, using the normal swipe path.
  const demo = new URLSearchParams(location.search).get('demo');
  const desktopEnvelopeDemo = !preview && demo === 'postcards';
  if ((preview || desktopEnvelopeDemo) && Object.hasOwn(sceneDuration, demo)) {
    document.addEventListener('recap:ready', () => {
      const start = stops[stops.findIndex(stop => stop.id === demo)-1];
      if (!start) return;
      window.scrollTo({top:start.y, behavior:'instant'});
      const timer = setTimeout(() => { if (Math.abs(scrollY-start.y)<4) play(1,desktopEnvelopeDemo); },900);
      signal.addEventListener('abort',()=>clearTimeout(timer),{once:true});
    }, {once:true, signal});
  }
  if (desktopEnvelopeDemo) {
    window.addEventListener('wheel',stop,{passive:true,signal});
    window.addEventListener('pointerdown',stop,{passive:true,signal});
  }
  let gesture;
  root.addEventListener('pointerdown', event => {
    if (!phone.matches || (event.pointerType !== 'touch' && !(preview && event.pointerType === 'mouse' && event.button === 0))) return;
    if (!event.isPrimary || busy() || event.target.closest('button,a,input,textarea,select,[role="dialog"]') ||
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
  root.addEventListener('dragstart',event=>{if(preview && gesture)event.preventDefault();},{signal});
  root.addEventListener('pointercancel',() => { gesture = null; },{signal});
  // The phone preview uses a desktop trackpad. Treat its momentum tail as one swipe.
  let lastWheel=-Infinity, wheelDistance=0, wheelUsed=false;
  root.addEventListener('wheel',event=>{
    if(!preview || !phone.matches || event.ctrlKey || Math.abs(event.deltaY)<=Math.abs(event.deltaX))return;
    event.preventDefault();
    const now=performance.now();
    if(now-lastWheel>200){wheelUsed=false;wheelDistance=0;}
    lastWheel=now;
    wheelDistance+=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?innerHeight:1);
    if(!wheelUsed && Math.abs(wheelDistance)>=24){
      wheelUsed=true;
      play(Math.sign(wheelDistance));
    }
  },{signal,passive:false});
  window.addEventListener('keydown',event=>{
    if(!phone.matches || event.altKey || event.ctrlKey || event.metaKey ||
        event.target.closest?.('button,a,input,textarea,select,[contenteditable="true"],[role="dialog"]'))return;
    const step={ArrowDown:1,PageDown:1,ArrowUp:-1,PageUp:-1}[event.key];
    if(!step)return;
    event.preventDefault();
    if(!event.repeat)play(step);
  },{signal});
  // A collapsing browser toolbar must not interrupt a running step.
  const size = new ResizeObserver(refresh);
  size.observe(root);
  signal.addEventListener('abort',()=>{stop();size.disconnect();curtain.remove();root.classList.remove('swipe-scenes');},{once:true});
}
