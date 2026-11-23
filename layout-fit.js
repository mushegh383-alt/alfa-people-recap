// Мобильная раскладка. Все сцены нарисованы на холсте шириной ~1920 и на
// вертикальном экране при вписывании «целиком» становятся крошечными.
// На портретных экранах вписываем по центральной «безопасной зоне» сцены
// (цифра, подпись, главный объект): боковые декорации уходят за край,
// а главное становится крупным. На десктопе всё как было.
export const PORTRAIT_RATIO = .8;
export const isPortrait = (width, height) => width / Math.max(1, height) < PORTRAIT_RATIO;

// Безопасная ширина центральной зоны каждой сцены в координатах её макета.
export const SAFE_WIDTH = {
  hero: 1000, personal: 1150, thanks: 1550, envelope: 1650, moments: 1050,
  income: 1350, planet: 1250, contact: 1250, achievements: 1150,
  coins: 1100, parksharing: 1350, learning: 1350, spending: 1250,
  office: 1350, finale: 1000, zodiac: 1250, 'profile-views': 1250,
};

// width/height — размер экрана (или сцены), designW/H — размер макета,
// pad — прежние поля (24 px и т.п.), чтобы десктоп не изменился ни на пиксель.
export function fitScale(width, height, designW, designH, key, padX = 0, padY = 0) {
  const desktop = Math.min((width - padX) / designW, (height - padY) / designH);
  if (!isPortrait(width, height) || !SAFE_WIDTH[key]) return Math.max(.01, desktop);
  // На телефоне сцена чуть меньше экрана — чтобы подписи не прятались под панели браузера.
  return Math.max(.01, .95 * Math.min(width / SAFE_WIDTH[key], (height - padY) / designH));
}

function syncPortraitClass() {
  const root = document.documentElement;
  root.classList.toggle('is-portrait', isPortrait(innerWidth, innerHeight));
}
syncPortraitClass();
addEventListener('resize', syncPortraitClass, { passive: true });

// Масштаб сцены из макета 1920 px. На телефоне — через CSS zoom, а не transform: scale.
// При transform Safari растеризует каждый отдельный GPU-слой внутри сцены (видео, холст,
// всё, что поверх них) в полный макетный размер ×3 — это сотни мегабайт и вылеты вкладки.
// С zoom те же слои получаются размером с экран. Картинка та же.
export function placeComposition(el, scale, after = '') {
  if (document.documentElement.dataset.quality === 'lite') {
    const z = String(scale);
    if (el.style.zoom !== z) el.style.zoom = z;
    el.style.transform = `translate(-50%, -50%)${after}`;
  } else {
    if (el.style.zoom) el.style.zoom = '';
    el.style.transform = `translate(-50%, -50%) scale(${scale})${after}`;
  }
}

// Прямоугольник на экране для элемента (или Range) внутри сцены с zoom. Safari (старый
// WebKit) отдаёт getBoundingClientRect внутри zoom «без масштаба» — делённым на zoom;
// поведение определяем один раз и при необходимости домножаем.
let legacyZoom;
function detectLegacyZoom() {
  const outer = document.createElement('div'), inner = document.createElement('div');
  outer.style.cssText = 'position:absolute;left:0;top:0;zoom:.5;visibility:hidden;pointer-events:none';
  inner.style.cssText = 'width:100px;height:10px';
  outer.append(inner); document.body.append(outer);
  const w = inner.getBoundingClientRect().width; outer.remove();
  return w > 75;
}
export function screenRect(target) {
  const r = target.getBoundingClientRect();
  legacyZoom ??= detectLegacyZoom();
  if (!legacyZoom) return r;
  let z = 1;
  for (let e = target instanceof Range ? target.commonAncestorContainer : target; e; e = e.parentElement || null) if (e.nodeType === 1) { const v = parseFloat(e.style.zoom); if (v > 0) z *= v; }
  // Старый WebKit делит на zoom координаты относительно документа: возвращаем их к экрану.
  return z === 1 ? r : new DOMRect((r.x + scrollX) * z - scrollX, (r.y + scrollY) * z - scrollY, r.width * z, r.height * z);
}
