// Все игровые числа в одном месте: баланс правится здесь, без поиска по коду.

export const ROUND = Object.freeze({
  duration: 60,          // секунд в раунде
  penalty: 5,            // столько марок снимает клякса или лужа
  width: 540,            // логическая ширина поля
  height: 960,
  playerY: 758,
  playerWidth: 160,
  playerHeight: 184,
  catchY: 790,           // уровень макушки (по нему бот оценивает время подлёта)
  // Тело пиплика — два эллипса, снятых по контуру спрайта (смещения от playerX / playerY).
  // Марка ловится, коснувшись любой части тела: макушки, боков, шапки.
  body: [
    { x: 4, y: 96, rx: 76, ry: 62 },   // туловище
    { x: -16, y: 32, rx: 32, ry: 28 }, // шапка
  ],
  stampRadius: 28,       // «радиус» марки при столкновении (марка 72×96)
  blotRadius: 26,        // клякса 72×72
});

export const ATTEMPTS_PER_DAY = 3;
export const STORAGE_KEY = 'alfa-newyear-postcards-v3';

// Кривая сложности по ходу раунда: [значение в начале, прирост к концу].
export const DIFFICULTY = Object.freeze({
  speed: [285, 255],       // px/с падения (было 245 + 220)
  interval: [.84, .38],    // пауза между марками, с (было .72 − .34)
  hazard: [.2, .18],       // шанс кляксы (было .13 + .17)
  sway: [8, 46],           // амплитуда покачивания марки, px (новое)
  expressEvery: 9,         // срочная марка раз в N секунд (было 7.5)
  waveEvery: 9,
});

export const STAMPS = Object.freeze([
  { id: 'goat', name: 'Огненная коза', frame: 'stamp-blue-small.svg', image: 'goat.png' },
  { id: 'ornament', name: 'Ёлочный шар', frame: 'stamp-blue.svg', image: 'ornament.png' },
  { id: 'sweet', name: 'Сладкий момент', frame: 'stamp-cream.svg', image: 'sweet.png' },
  { id: 'tree', name: 'Праздничная ёлка', frame: 'stamp-cream-alt.svg', image: 'tree.png' },
]);

export const MECHANICS = Object.freeze([
  { id: 'wind', at: 8, title: 'Ветер', hint: 'Следи за стрелкой: марки сносит вбок' },
  { id: 'waves', at: 18, title: 'Почтовая волна', hint: 'Выбирай марки между кляксами' },
  { id: 'express', at: 30, title: 'Срочная марка', hint: 'Падает быстрее. Поймай её за +3' },
  { id: 'puddles', at: 42, title: 'Чернильные лужи', hint: 'Обходи пятна внизу: они тоже снимают 5' },
]);

// Стоимость открыток — накопительная, марки не тратятся.
// Рассчитана на уверенного игрока (~45 марок за раунд): 3 попытки в день →
// вся коллекция примерно за 3,5–4 дня (~11 раундов). Игроку послабее
// (~23 марки за раунд по балансному боту, src/balance.js) понадобится около недели.
export const POSTCARDS = Object.freeze([
  { id: 'goat', name: 'Год больших чудес', threshold: 60, image: 'goat.png', bg: '#1ac3fd', ink: '#020101', accent: '#ef3124', lines: ['Пусть год', 'удивляет!'] },
  { id: 'ornament', name: 'Праздник рядом', threshold: 150, image: 'ornament.png', bg: '#f8e4c2', ink: '#020101', accent: '#ef3124', lines: ['Счастье', 'уже рядом'] },
  { id: 'sweet', name: 'Сладкие моменты', threshold: 250, image: 'sweet.png', bg: '#fa7ab3', ink: '#020101', accent: '#f8e4c2', lines: ['Больше', 'сладких', 'моментов'] },
  { id: 'tree', name: 'Время загадывать', threshold: 360, image: 'tree.png', bg: '#020101', ink: '#f8e4c2', accent: '#ef3124', lines: ['Всё', 'сбудется!'] },
  { id: 'piplik', name: 'От пиплика с любовью', threshold: 480, image: null, bg: '#ef3124', ink: '#f8e4c2', accent: '#1ac3fd', lines: ['С новым', 'счастьем!'] },
]);

export const RECAP_URL = '../#finale';
export const asset = name => new URL(`../assets/${name}`, import.meta.url).href;
