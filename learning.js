import { createScrollVideo } from './performance.js';
import { optimizedAssetUrl } from './resources.js';
import { requestRenderFrame as requestAnimationFrame, cancelRenderFrame as cancelAnimationFrame } from './performance.js';
import { createSpending } from './blocks/spending.js';
import { bookChapterPlan, bookFrame, bookGeometry, bookSpendingPose } from './learning-layout.js';
import { reel } from './november-layout.js';
import { setHeadingScale } from './typography.js';

export function createBookChapter(data) {
  const chapter = document.createElement('div');
  const hasSpending = Boolean(data.spending), plan = bookChapterPlan(hasSpending);
  chapter.className = `book-chapter${hasSpending ? ' has-spending' : ' standalone-book'}`;
  chapter.dataset.route = hasSpending ? 'from-spending' : 'standalone';
  chapter.style.setProperty('--chapter-height', `${plan.height * 100}svh`);
  chapter.innerHTML = `<span class="learning-anchor" id="learning" aria-hidden="true"></span><div class="book-chapter-stage"><div class="book-chapter-backdrop"></div><div class="learning-book" aria-hidden="true"><video muted playsinline preload="none" disablepictureinpicture tabindex="-1"></video><img class="learning-open-poster" alt="" /></div><section class="learning-scene" aria-label="Обучение"><div class="learning-composition"><h2 class="november-heading learning-heading"></h2><div class="learning-stat learning-courses"><p class="learning-number" aria-hidden="true"></p><p class="learning-label"></p><span class="sr-only"></span></div><div class="learning-stat learning-hours"><p class="learning-number" aria-hidden="true"></p><p class="learning-label"></p><span class="sr-only"></span></div></div></section></div>`;
  chapter.querySelector('.learning-anchor').style.top = `${plan.anchor * 100}svh`;
  const stage = chapter.querySelector('.book-chapter-stage');
  if (hasSpending) stage.prepend(createSpending(data));
  const video = chapter.querySelector('video');
  video.src = data.learning.video; video.poster = optimizedAssetUrl(data.learning.poster);
  video.muted = video.defaultMuted = true;
  chapter.querySelector('.learning-open-poster').src = optimizedAssetUrl(data.learning.openPoster);
  chapter.querySelector('.learning-heading').textContent = data.learning.title;
  for (const key of ['courses', 'hours']) {
    const stat = chapter.querySelector(`.learning-${key}`), number = stat.querySelector('.learning-number');
    stat.dataset.value = data.learning[key];
    number.style.fontSize = `${Math.min(500, 1100 / Math.max(1, String(data.learning[key]).length))}px`;
    stat.querySelector('.learning-label').textContent = data.learning[`${key}Label`];
    stat.querySelector('.learning-label').setAttribute('aria-hidden', 'true');
    stat.querySelector('.sr-only').textContent = `${data.learning[key]}. ${data.learning[`${key}Label`]}`;
  }
  return chapter;
}

export function mountBookChapter(root, signal) {
  const chapter = root.querySelector('.book-chapter'); if (!chapter) return;
  const stage = chapter.querySelector('.book-chapter-stage'), book = chapter.querySelector('.learning-book'), video = book.querySelector('video');
  const composition = chapter.querySelector('.learning-composition'), heading = chapter.querySelector('.learning-heading'), backdrop = chapter.querySelector('.book-chapter-backdrop');
  const spending = chapter.querySelector('.spending');
  const stats = ['courses', 'hours'].map(key => ({ key, node: chapter.querySelector(`.learning-${key}`) }));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let active = false, raf = 0, last = 0, progress, latest = 0;
  const transport=createScrollVideo(video,signal,schedule);
  function seek(){transport.seek(latest,active);}

  function update(now) {
    raf = 0; if (!active || signal.aborted || document.hidden) return;
    const b = chapter.getBoundingClientRect(), target = -b.top / innerHeight;
    const dt = last ? Math.min(64, now - last) : 16; last = now;
    progress = progress === undefined || reduced.matches ? target : progress + (target - progress) * (1 - Math.exp(-dt / 90));
    if (Math.abs(target - progress) < .0001) progress = target;
    const f = bookFrame(progress, Boolean(spending), reduced.matches), g = spending && !reduced.matches ? bookSpendingPose(stage.clientWidth, innerHeight, progress, f.travel) : bookGeometry(stage.clientWidth, innerHeight, f.travel, Boolean(spending));
    latest = f.time;
    book.style.width = book.style.height = `${g.size}px`;
    book.style.transform = `translate(${g.x - g.size / 2}px,${g.y - g.size / 2 + (reduced.matches && spending ? innerHeight : 0)}px) rotate(${g.rotation || 0}deg)`;
    book.style.opacity = g.opacity ?? f.appear;
    book.style.visibility = (g.opacity ?? f.appear) > .001 ? 'visible' : 'hidden';
    composition.style.transform = `translate(-50%,-50%) scale(${g.fit})`;
    setHeadingScale(composition, g.fit, stage.clientWidth, innerHeight);
    backdrop.style.opacity = spending ? f.exit : 1;
    if (spending) {
      spending.style.transform = reduced.matches ? '' : `translateY(${-f.exit * innerHeight * .18}px) scale(${1 + f.exit * .35})`;
      spending.style.opacity = reduced.matches ? 1 : 1 - f.exit;
      spending.style.visibility = reduced.matches || f.exit < .9999 ? 'visible' : 'hidden';
      spending.inert = !reduced.matches && f.exit > .8;
    }
    heading.style.opacity = f.title;
    heading.style.transform = `translateY(${(1 - f.title) * 65}px) scale(${.96 + f.title * .04})`;
    const ready = reduced.matches || video.currentTime >= 5.24;
    for (const { key, node } of stats) {
      const reveal = ready ? f[key] : 0;
      node.style.opacity = reveal;
      node.style.visibility = reveal > .001 ? 'visible' : 'hidden';
      node.style.transform = `perspective(1000px) translateY(${(1 - reveal) * 70}px) rotateY(${(key === 'courses' ? -1 : 1) * (1 - reveal) * 20}deg)`;
      node.inert = reveal < .5;
      node.querySelector('.learning-number').textContent = reduced.matches ? node.dataset.value : reel(node.dataset.value, f[key === 'courses' ? 'digitsCourses' : 'digitsHours']);
    }
    chapter.classList.toggle('book-reduced', reduced.matches);
    chapter.dataset.progress = progress.toFixed(4);
    chapter.dataset.time = f.time.toFixed(3);
    chapter.dataset.phase = f.travel < 1 ? 'approach' : f.time < 5.24 ? 'opening' : 'reading';
    seek();
    if (Math.abs(target - progress) > .0001) schedule();
  }
  function schedule() { if (!raf && active && !signal.aborted && !document.hidden) raf = requestAnimationFrame(update); }
  const observer = new IntersectionObserver(([entry]) => { active = entry.isIntersecting; if (active) schedule(); else { transport.pause(); cancelAnimationFrame(raf); raf = last = 0; } }, { rootMargin: '150px' });
  observer.observe(chapter);
  const resize = new ResizeObserver(schedule); resize.observe(stage);
  window.addEventListener('scroll', schedule, { passive: true, signal });
  document.addEventListener('visibilitychange', () => { last = 0; schedule(); }, { signal });
  video.addEventListener('loadeddata', schedule, { signal });
  reduced.addEventListener('change', schedule, { signal });
  signal.addEventListener('abort', () => { observer.disconnect(); resize.disconnect(); cancelAnimationFrame(raf); video.pause(); video.removeAttribute('src'); video.load(); }, { once: true });
}
