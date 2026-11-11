// Офис из Figma (New year, node 309:2611): тумба, лампа и стул, верхний ящик
// выезжает на зрителя. Три слоя повторяют макет один в один:
//   1) сцена с закрытыми ящиками;
//   2) открытый ящик под маской — растёт и съезжает вниз, выезжая на зрителя;
//   3) та же сцена под маской столешницы поверх ящика — он «выезжает из-под» неё.
// В Figma ящик открывается за 0.6 с по cubic-bezier(.5, 0, .5, 1); здесь тот же
// ход привязан к прогрессу скролла сцены. Интерфейс { load, resize, seek } прежний,
// поэтому механика скролла (ending-motion.js) не меняется.
const prepared = new WeakMap();
// Конечные значения подобраны так, чтобы анимация сама приходила в финальный кадр
// (Figma node 296:12862): drawer.png дорастает до 1607.5×1607.7 в (216.3, 161.9).
// Ход и кривая — как в анимации 309:2611, только конечные размеры под финал.
const OPEN = { scale: 1.7859, x: 6.04, y: 505.7 };
// Тумба со стулом на исходной картинке почти совпадает с финальной — лишь сдвигается.
const SCENE_SHIFT = { x: -70, y: -20 };
const OPEN_UNTIL = .5;   // доля прогресса сцены, за которую ящик открывается полностью

// cubic-bezier(.5, 0, .5, 1) — решаем x(t) = p бисекцией.
function bezier(p) {
  const x = t => 3 * (1 - t) * (1 - t) * t * .5 + 3 * (1 - t) * t * t * .5 + t * t * t;
  const y = t => 3 * (1 - t) * t * t + t * t * t;
  let lo = 0, hi = 1;
  for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (x(mid) < p) lo = mid; else hi = mid; }
  return y((lo + hi) / 2);
}

export function officeDrawerPose(progress, reduced = false) {
  const t = reduced ? 1 : bezier(Math.max(0, Math.min(1, progress / OPEN_UNTIL)));
  return { scale: 1 + (OPEN.scale - 1) * t, x: OPEN.x * t, y: OPEN.y * t, sceneX: SCENE_SHIFT.x * t, sceneY: SCENE_SHIFT.y * t };
}

export function createOfficeAnimation(section, signal) {
  if (prepared.has(section)) return prepared.get(section);
  const drawer = section.querySelector('.office-art-drawer');
  const art = section.querySelector('.office-art');
  const front = section.querySelector('.office-front-track');
  const images = [...section.querySelectorAll('.office-art img, .office-front-track img')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let loading, last = -1;
  function load() {
    return loading ||= Promise.all(images.map(img => img.complete && img.naturalWidth ? null : new Promise((resolve, reject) => {
      img.addEventListener('load', resolve, { once: true, signal });
      img.addEventListener('error', () => reject(new Error(`Could not load ${img.src}`)), { once: true, signal });
    }))).then(() => { section.classList.add('has-office-animation'); seek(Math.max(0, last)); });
  }
  function seek(progress) {
    const p = Math.max(0, Math.min(1, progress));
    if (p === last || !drawer) return;
    last = p;
    const pose = officeDrawerPose(p, reduced.matches);
    const drawerMove = `translate(${pose.x.toFixed(2)}px, ${pose.y.toFixed(2)}px) scale(${pose.scale.toFixed(4)})`;
    const sceneMove = `translate(${pose.sceneX.toFixed(2)}px, ${pose.sceneY.toFixed(2)}px)`;
    art.style.transform = sceneMove;
    drawer.style.transform = drawerMove;
    // Передняя стенка лежит поверх цифры, поэтому она вне .office-art, но едет так же.
    if (front) front.style.transform = `${sceneMove} ${drawerMove}`;
    section.dataset.officeFrame = pose.scale.toFixed(3);
  }
  const api = { load, resize() {}, seek };
  prepared.set(section, api);
  return api;
}
