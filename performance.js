// Rendering budgets affect pixels and secondary effects, never backend data or
// scroll endpoints. Missing browser hardware hints use the balanced profile.
export const qualityBudgets = Object.freeze({
  full: { maxFps:60, dpr:1.25, pixels:2_700_000, videoFps:30, seekHz:30, carCache:10, decodes:3, mediaWidth:1536 },
  balanced: { maxFps:60, dpr:1, pixels:1_750_000, videoFps:30, seekHz:24, carCache:8, decodes:2, mediaWidth:1280 },
  lite: { maxFps:60, dpr:.85, pixels:1_000_000, videoFps:24, seekHz:20, carCache:5, decodes:2, mediaWidth:960 },
});
export function chooseQuality({cores,memory,saveData=false}={}) {
  if(saveData || (cores>0&&cores<=4) || (memory>0&&memory<=4))return 'lite';
  return cores>=12&&memory>=8?'full':'balanced';
}
export function canvasBudget(width,height,tier=quality) {
  const budget=qualityBudgets[tier], ratio=Math.min(globalThis.devicePixelRatio||1,budget.dpr,Math.sqrt(budget.pixels/Math.max(1,width*height)));
  return {ratio,width:Math.max(1,Math.round(width*ratio)),height:Math.max(1,Math.round(height*ratio))};
}
const nav=globalThis.navigator||{};
// Телефоны (сенсор и маленький экран) сразу получают облегчённый режим: iOS не
// сообщает память, а вкладке на телефоне доступно куда меньше, чем на ноутбуке.
export const isPhone = Boolean(globalThis.matchMedia?.('(pointer: coarse)').matches && Math.min(globalThis.screen?.width || 9999, globalThis.screen?.height || 9999) < 600);
let quality=isPhone?'lite':chooseQuality({cores:nav.hardwareConcurrency,memory:nav.deviceMemory,saveData:nav.connection?.saveData});
const override=globalThis.location?new URLSearchParams(location.search).get('renderQuality'):null;
if(override&&Object.hasOwn(qualityBudgets,override))quality=override;
const listeners=new Set();
export const getQuality=()=>quality;
export const getBudget=()=>qualityBudgets[quality];
export function onQualityChange(callback,signal) {listeners.add(callback);signal?.addEventListener('abort',()=>listeners.delete(callback),{once:true});}
function applyQuality() {if(globalThis.document?.documentElement)document.documentElement.dataset.quality=quality;}
export function lowerQuality() {
  const next=quality==='full'?'balanced':'lite';if(next===quality)return false;
  quality=next;applyQuality();listeners.forEach(callback=>callback());return true;
}
applyQuality();
// A shared, demand-driven 60Hz clock coalesces renderers on 120/144Hz displays.
// It has no idle loop. Cancellation removes the pending work before it runs.
export function createFrameQueue(request,cancel,fps=()=>60,onTick=()=>{}) {
  const queue=new Map();let serial=0,native=0,last=-Infinity;
  function schedule(){if(!native&&queue.size)native=request(tick);}
  function tick(now){native=0;if(now-last<1000/fps()-1){schedule();return;}const dt=now-last;last=now;onTick(dt,now);
    const batch=[...queue];queue.clear();for(const [id,fn] of batch){try{fn(now);}catch(error){if(typeof globalThis.reportError==='function')globalThis.reportError(error);else console.error(error);}}schedule();}
  return {request(fn){const id=++serial;queue.set(id,fn);schedule();return id;},cancel(id){queue.delete(id);if(!queue.size&&native){cancel(native);native=0;}}};
}
let deadline=0,samples=[],cooldown=0;
function observeFrame(dt,now) {
  if(!Number.isFinite(dt)||now>deadline||globalThis.document?.hidden||now<cooldown)return;
  // A single decode/upload spike cannot trigger a downgrade. Cap its weight,
  // but still recognize consistently very slow rendering on weak hardware.
  samples.push(Math.min(dt,100));
  if(samples.length<40)return;
  const slow=samples.filter(x=>x>28).length,mean=samples.reduce((s,x)=>s+x,0)/samples.length;samples=[];
  if(mean>25&&slow>14){if(lowerQuality())cooldown=now+4000;}
}
const frames=createFrameQueue(fn=>globalThis.requestAnimationFrame(fn),id=>globalThis.cancelAnimationFrame(id),()=>getBudget().maxFps,observeFrame);
export const requestRenderFrame=fn=>frames.request(fn);
export const cancelRenderFrame=id=>frames.cancel(id);
export function startPerformanceMonitor(signal) {
  globalThis.window?.addEventListener('scroll',()=>{deadline=(globalThis.performance?.now()||0)+250;},{passive:true,signal});
}

const mediaFiles = {
 'planet/planet-smooth.mp4':'planet','envelope/envelope.mp4':'envelope','learning/book-scroll.mp4':'book',
};
export function selectMediaSources(root) {
  if(quality==='full')return;
  for(const video of root.querySelectorAll('video')) {
    const url=new URL(video.src,document.baseURI);
    for(const [path,name] of Object.entries(mediaFiles)) {
      const expected=new URL(`./assets/${path}`,import.meta.url);
      if(url.href===expected.href){video.src=new URL(`./assets/optimized/${name}-${quality}.mp4`,import.meta.url).href;break;}
    }
  }
}
// One latest request per video. Quantization matches the actual output frames,
// avoiding many near-identical seeks and keeping offscreen media completely idle.
export function createScrollVideo(video,signal,onFrame=()=>{}) {
  let latest=0,visible=false,timer=0,lastSeek=-Infinity;
  function pump() {
    timer=0;if(!visible||signal.aborted||document.hidden||video.seeking||!Number.isFinite(video.duration)||video.duration<=0)return;
    const b=getBudget(),time=Math.min(video.duration-.018,Math.max(0,Math.round(latest*b.videoFps)/b.videoFps));
    if(Math.abs(video.currentTime-time)<1/b.videoFps*.45)return;
    const now=globalThis.performance?.now()||Date.now(),wait=1000/b.seekHz-(now-lastSeek);
    if(wait>1){timer=setTimeout(pump,wait);return;}lastSeek=now;video.currentTime=time;
  }
  // Safari на iPhone не грузит данные видео с preload="none", пока его ни разу
  // не запустили, и перемотка по currentTime ничего не показывает. Перед первой
  // перемоткой один раз беззвучно запускаем и сразу ставим на паузу.
  let primed=false;
  function prime(){
    if(primed)return;primed=true;
    video.preload='auto';video.muted=true;video.playsInline=true;
    if(video.readyState<1)video.load();
    const started=video.play();
    if(started&&started.then)started.then(()=>{video.pause();pump();}).catch(()=>{});
  }
  video.addEventListener('emptied',()=>{primed=false;},{signal});
  function seek(time,on=true){latest=time;visible=on;if(!on){clearTimeout(timer);timer=0;video.pause();return;}prime();if(!timer)pump();}
  video.addEventListener('seeked',()=>{if(!visible||signal.aborted)return;onFrame();pump();},{signal});
  video.addEventListener('loadeddata',()=>{if(visible)pump();},{signal});
  signal.addEventListener('abort',()=>{clearTimeout(timer);video.pause();},{once:true});
  return {seek,pause(){seek(latest,false);}};
}

// SVG-свечения с большим размытием в облегчённом режиме не «распрямляем» (без
// размытия они становятся жёсткими пятнами), а помечаем, чтобы спрятать.
export function markSoftGlows(svg, threshold = 20) {
  for (const node of svg.querySelectorAll('[filter]')) {
    const id = node.getAttribute('filter').match(/url\(#([^)]+)\)/)?.[1];
    const filter = id && svg.querySelector(`[id="${id}"]`);
    const blur = filter ? Math.max(0, ...[...filter.querySelectorAll('feGaussianBlur')].map(b => parseFloat(b.getAttribute('stdDeviation')) || 0)) : 0;
    // Прячем только круглые пятна-свечения: фигуры (звезда у собеседника и т.п.)
    // без размытия остаются собой, их скрывать нельзя.
    const isShape = node.matches('path, polygon') || node.querySelector('path, polygon');
    if (blur >= threshold && !isShape) node.classList.add('soft-glow');
  }
  return svg;
}

// На телефоне (lite) декодеры видео пройденных глав держат память до конца
// страницы, и к офису/финалу вкладка падала. Выгружаем видео, когда их глава
// дальше полутора экранов, и возвращаем заранее при подходе к ней.
export function manageVideoMemory(root, signal) {
  if (quality !== 'lite') return;
  const groups = [
    [root.querySelector('.opening-story'), 'video:not(.hero-film-reveal):not(.hero-film-loop)'],
    [root.querySelector('.book-chapter'), 'video'],
  ];
  for (const [section, selector] of groups) {
    if (!section) continue;
    const videos = [...section.querySelectorAll(selector)];
    if (!videos.length) continue;
    const saved = new Map();
    const unload = () => { for (const v of videos) { const src = v.getAttribute('src'); if (!src || saved.has(v)) continue; saved.set(v, src); v.pause(); v.removeAttribute('src'); v.load(); } };
    const restore = () => { for (const [v, src] of saved) { v.setAttribute('src', src); v.load(); } saved.clear(); };
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting ? restore() : unload(), { rootMargin: '150% 0px' });
    observer.observe(section);
    signal.addEventListener('abort', () => observer.disconnect(), { once: true });
  }
}

// Телефон: главы дальше экрана от текущего места не рисуем вовсе (visibility:
// hidden у содержимого — высота и скролл сохраняются). Браузер освобождает их
// слои и может выгрузить картинки; к главе возвращаемся заранее, за экран.
export function manageSectionMemory(root, signal) {
  if (quality !== 'lite') return;
  const sections = [...root.querySelectorAll(':scope > .opening-story, :scope > .recap-slides > *')];
  // Скрытая глава в Safari/Telegram на iPhone всё равно держит распакованные
  // картинки: к концу страницы в памяти оказывался почти весь сайт и вкладка
  // падала. Поэтому далёкие главы по-настоящему отдают картинки (src → пустышка)
  // и получают их обратно за экран до подхода.
  const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  const release = section => {
    for (const img of section.querySelectorAll('img')) {
      const src = img.getAttribute('src');
      if (!src || src === BLANK || img.dataset.memSrc) continue;
      img.dataset.memSrc = src; img.src = BLANK;
    }
    for (const image of section.querySelectorAll('svg image')) {
      const href = image.getAttribute('href');
      if (!href || href.startsWith('data:') || image.dataset.memHref) continue;
      image.dataset.memHref = href; image.setAttribute('href', BLANK);
    }
  };
  const restore = section => {
    for (const img of section.querySelectorAll('img[data-mem-src]')) { img.src = img.dataset.memSrc; delete img.dataset.memSrc; }
    for (const image of section.querySelectorAll('svg image[data-mem-href]')) { image.setAttribute('href', image.dataset.memHref); delete image.dataset.memHref; }
  };
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      entry.target.classList.toggle('is-offscreen-chapter', !entry.isIntersecting);
      if (entry.isIntersecting) restore(entry.target); else release(entry.target);
    }
  }, { rootMargin: '100% 0px' });
  sections.forEach(section => observer.observe(section));
  signal.addEventListener('abort', () => { observer.disconnect(); sections.forEach(s => { s.classList.remove('is-offscreen-chapter'); restore(s); }); }, { once: true });
}
