import { coinPose, coinsEntrance, coinsFrame, coinsInformation, coinsScrollProgress } from './coins-layout.js';
import { spendingEntrance } from './spending-layout.js';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

export function mountCoinsMotion(root, signal) {
  const section = root.querySelector('.coins');
  if (!section) return;
  const stage = section.querySelector('.coins-stage');
  const composition = section.querySelector('.coins-composition');
  const paper = section.querySelector('.coins-paper');
  const layers = [...section.querySelectorAll('.coin-layer')];
  const number = section.querySelector('.coins-number');
  const digits = [...number.children];
  const title = section.querySelector('.coins-title');
  const caption = section.querySelector('.coins-caption span');
  const decoration = section.querySelector('.coins-decoration');
  const next = section.classList.contains('has-spending-next') ? section.nextElementSibling : null;
  let frame = 0, inView = false, progress, entrance, lastTime = 0, closing = 0, scale = 1;
  function fit() {
    scale = Math.min(stage.clientWidth / coinsFrame.width, stage.clientHeight / coinsFrame.height);
    schedule();
  }
  function update(now) {
    frame = 0;
    if (!inView || document.hidden || signal.aborted) return;
    const box = section.getBoundingClientRect();
    const target = reducedMotion.matches ? 1 : coinsScrollProgress(box.top, box.height, innerHeight);
    const enterTarget = reducedMotion.matches ? 1 : coinsEntrance(box.top, innerHeight);
    const closeTarget = next && !reducedMotion.matches ? spendingEntrance(next.getBoundingClientRect().top, innerHeight) : 0;
    const delta = lastTime ? Math.min(64, Math.max(1, now - lastTime)) : 16;
    lastTime = now;
    if (progress === undefined || reducedMotion.matches) { progress = target; entrance = enterTarget; closing = closeTarget; }
    else {
      progress += (target - progress) * (1 - Math.exp(-delta / 75));
      entrance += (enterTarget - entrance) * (1 - Math.exp(-delta / 90));
      closing += (closeTarget - closing) * (1 - Math.exp(-delta / 90));
    }
    const settling = Math.abs(target - progress) > .0001 || Math.abs(enterTarget - entrance) > .0001 || Math.abs(closeTarget - closing) > .0001;
    if (!settling) { progress = target; entrance = enterTarget; closing = closeTarget; }
    const information = coinsInformation(progress, number.dataset.value);
    composition.style.opacity = entrance * (1 - closing);
    composition.style.transform = `translate(-50%, -50%) scale(${scale}) translateY(${-closing * 100}px) scale(${1 - closing * .08})`;
    paper.style.opacity = entrance;
    paper.style.setProperty('--coins-paper-feather', `${(1 - entrance) * 180}px`);
    layers.forEach((layer, index) => {
      const pose = coinPose(progress, index);
      layer.style.transform = `translate(${pose.x}px, ${pose.y + (1 - entrance) * 100}px) rotate(${pose.rotation}deg)`;
    });
    number.style.opacity = information.number;
    number.style.transform = `translateY(${(1 - information.number) * 60}px) scale(${.94 + .06 * information.number})`;
    digits.forEach((digit, index) => { if (digit.textContent !== information.digits[index]) digit.textContent = information.digits[index]; });
    title.style.opacity = information.title;
    title.style.transform = `translateX(-50%) translateY(${(1 - information.title) * 40}px)`;
    caption.style.transform = `translateY(${(1 - information.caption) * 120}%)`;
    decoration.style.opacity = information.decoration;
    decoration.style.transform = `translateY(${(1 - information.decoration) * 50}px) rotate(${(1 - information.decoration) * -35}deg) scale(${.65 + information.decoration * .35})`;
    section.dataset.progress = progress.toFixed(4);
    section.dataset.closing = closing.toFixed(4);
    section.dataset.state = progress < .48 ? 'opening' : progress < .78 ? 'counter' : progress < 1 ? 'caption' : 'complete';
    if (settling) schedule();
  }
  function schedule() { if (!frame && inView && !document.hidden && !signal.aborted) frame = requestAnimationFrame(update); }
  const observer = new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting;
    section.classList.toggle('is-motion-active', inView);
    if (!inView) { cancelAnimationFrame(frame); frame = 0; progress = entrance = undefined; lastTime = 0; composition.style.opacity = paper.style.opacity = 0; }
    else schedule();
  }, { rootMargin: '150px' });
  observer.observe(section);
  const resize = new ResizeObserver(fit);
  resize.observe(stage); fit();
  window.addEventListener('scroll', schedule, { passive: true, signal });
  document.addEventListener('visibilitychange', () => { lastTime = 0; schedule(); }, { signal });
  reducedMotion.addEventListener('change', schedule, { signal });
  signal.addEventListener('abort', () => { cancelAnimationFrame(frame); observer.disconnect(); resize.disconnect(); }, { once: true });
}
