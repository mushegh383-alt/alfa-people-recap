import { coinLayers } from '../coins-layout.js';

export function createCoins(data) {
  const section = document.createElement('section');
  section.className = `coins${data.achievements ? ' follows-achievements' : ''}`;
  section.id = 'coins';
  section.setAttribute('aria-labelledby', 'coins-title');
  section.innerHTML = `
    <div class="coins-stage">
      <div class="coins-paper" aria-hidden="true"><img src="./assets/thanks-texture.webp" alt="" /></div>
      <div class="coins-composition">
        <h2 id="coins-title" class="coins-title"></h2>
        <div class="coins-stack" aria-hidden="true"></div>
        <div class="coins-decoration" aria-hidden="true"><div><img src="./assets/coins-star.svg" alt="" /></div></div>
        <p class="coins-caption" id="coins-caption"><span></span></p>
        <p class="sr-only coins-result" aria-describedby="coins-caption"></p>
      </div>
    </div>
  `;
  section.querySelector('.coins-title').textContent = data.coins.title;
  section.querySelector('.coins-caption span').textContent = data.coins.label;
  section.querySelector('.coins-result').textContent = String(data.coins.earned);
  const stack = section.querySelector('.coins-stack');
  coinLayers.forEach((layer, index) => {
    const slice = document.createElement('div');
    slice.className = `coin-layer coin-${layer.name}`;
    Object.assign(slice.style, {
      top: `${layer.top}px`,
      maskImage: `url('./assets/coin-${layer.name}-mask.svg')`,
      maskPosition: `${layer.maskX}px ${layer.maskY}px`,
      maskSize: `${layer.maskW}px ${layer.maskH}px`,
      transformOrigin: `${layer.pivotX}px ${layer.pivotY}px`,
    });
    const image = document.createElement('img');
    image.src = './assets/coins-source.webp';
    image.width = 1119; image.height = 1406; image.alt = '';
    slice.append(image);
    if (index === 2) {
      const number = document.createElement('p');
      number.className = 'coins-number';
      number.dataset.value = String(data.coins.earned);
      number.style.setProperty('--coins-number-size', `${Math.min(550, 2200 / String(data.coins.earned).length)}px`);
      [...String(data.coins.earned)].forEach(digit => {
        const slot = document.createElement('span'); slot.textContent = digit; number.append(slot);
      });
      stack.append(number);
    }
    stack.append(slice);
  });
  return section;
}
