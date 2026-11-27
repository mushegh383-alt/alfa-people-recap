import { spendingShapes } from '../spending-layout.js?local=20';

export function createSpending(data) {
  const section = document.createElement('section');
  section.className = 'spending';
  section.id = 'spending';
  section.setAttribute('aria-label', 'Потраченные коины');
  section.innerHTML = `
    <div class="spending-stage">
      <div class="spending-paper" aria-hidden="true"></div>
      <div class="spending-composition">
        <div class="spending-artboard">
          <div class="spending-shapes" aria-hidden="true"></div>
          <p class="spending-number" aria-describedby="spending-caption"><span class="spending-digits" aria-hidden="true"></span><span class="sr-only"></span></p>
          <h2 class="spending-caption" id="spending-caption"><span></span></h2>
          <p class="spending-note"></p>
        </div>
      </div>
    </div>
  `;
  section.querySelector('.spending-caption span').textContent = data.spending.label;
  section.querySelector('.spending-note').textContent = data.spending.note;
  { const title = document.createElement('h2'); title.className = 'november-heading block-heading spending-heading'; title.setAttribute('aria-hidden', 'true'); title.textContent = data.spending.title || 'покупки'; section.querySelector('.spending-composition').append(title); }
  const number = section.querySelector('.spending-digits');
  number.dataset.value = String(data.spending.amount);
  number.style.setProperty('--spending-count-size', `${Math.min(550, 2200 / String(data.spending.amount).length)}px`);
  section.querySelector('.sr-only').textContent = String(data.spending.amount);
  [...String(data.spending.amount)].forEach(digit => {
    const slot = document.createElement('span'); slot.textContent = digit; number.append(slot);
  });
  const shapes = section.querySelector('.spending-shapes');
  spendingShapes.forEach((shape, index) => {
    const item = document.createElement('div');
    item.className = `spending-shape spending-${shape.kind}`;
    item.dataset.shape = index;
    item.style.setProperty('--shape-glow', shape.color);
    item.style.width = `${shape.width}px`;
    item.style.height = `${shape.height}px`;
    const face = document.createElement('div');
    face.className = 'spending-face';
    // Bottom-row assets retain their authored light, bevel and blur as vectors.
    const artwork = { 6: 'tile-cream.svg', 7: 'tile-ring.svg', 9: 'tile-coin.svg', 10: 'tile-flake.svg' }[index];
    if (index === 8 && data.learning) { item.hidden = true; }
    face.style.background = !artwork && ['solid', 'ring'].includes(shape.kind) ? shape.color : 'transparent';
    if (artwork) item.dataset.artwork = '';
    if (shape.kind === 'ring' && !artwork) face.innerHTML = '<div class="spending-ring-core"></div>';
    if (artwork || ['snowflake', 'alfa', 'burst', 'ornament'].includes(shape.kind)) {
      const image = document.createElement('img');
      // Иконки в новом стиле (PNG) — те же места и анимация.
      image.src = artwork ? `./assets/restyle/spending/${artwork.replace('.svg', '.webp')}` : shape.kind === 'ornament' ? './assets/restyle/spending/ornament.webp' : `./assets/restyle/spending/spending-${shape.kind}.webp`;
      image.alt = '';
      if (shape.kind === 'burst' && !artwork) {
        const turn = document.createElement('div'); turn.className = 'spending-burst-turn'; turn.append(image); face.append(turn);
      } else face.append(image);
    }
    item.append(face); shapes.append(item);
  });
  return section;
}
