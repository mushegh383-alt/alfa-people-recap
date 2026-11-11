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
  return Math.max(.01, Math.min(width / SAFE_WIDTH[key], (height - padY) / designH));
}

function syncPortraitClass() {
  const root = document.documentElement;
  root.classList.toggle('is-portrait', isPortrait(innerWidth, innerHeight));
}
syncPortraitClass();
addEventListener('resize', syncPortraitClass, { passive: true });
